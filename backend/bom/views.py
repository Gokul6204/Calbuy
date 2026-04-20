"""
API views for BOM upload and list.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import BOM
from .serializers import BOMSerializer
from .parsers import parse_file

ALLOWED_EXTENSIONS = {"xlsx", "xls", "csv", "pdf", "kss"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _enrich_bom_data(row):
    """Lookup part name and category from PartMaster and add formatted string."""
    part_code = (row.get("part") or "").strip()
    if part_code:
        from .models import PartMaster
        master = PartMaster.objects.filter(part__iexact=part_code).first()
        if master:
            row["part_name"] = master.part_name
            row["category"] = master.category
            row["formatted_part"] = f"{master.part_name}({part_code})"
        else:
            row["formatted_part"] = part_code
    return row


class BOMUploadView(APIView):
    """
    Upload BOM file (XLSX, CSV, PDF) and return the parsed rows.
    Rows are NOT automatically stored in the database.
    """

    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response(
                {"error": "No file provided. Use form field 'file'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ext = (file_obj.name or "").lower().split(".")[-1]
        if ext not in ALLOWED_EXTENSIONS:
            return Response(
                {"error": f"Unsupported format. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if file_obj.size > MAX_FILE_SIZE:
            return Response(
                {"error": "File too large. Maximum size is 10 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        content = file_obj.read()
        try:
            rows = parse_file(content, file_obj.name)
        except Exception as e:
            return Response(
                {"error": f"Failed to parse file: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not rows:
            return Response(
                {"error": "No BOM rows found in file."},
                status=status.HTTP_400_BAD_REQUEST,
            )
            
        # Optimization: Map keys to the standard format if needed, though parse_file should do it.
        # We also want to include a temporary local ID for frontend mapping.
        import uuid
        for row in rows:
            row = _enrich_bom_data(row)
            row["temp_id"] = str(uuid.uuid4())
            row["source_file"] = row.get("source_file", file_obj.name)

        return Response(
            {"message": f"Parsed {len(rows)} BOM line(s).", "rows": rows},
            status=status.HTTP_200_OK,
        )


class BOMBulkCreateView(APIView):
    """
    Bulk create many BOM records in one request (for Save button).
    """
    def post(self, request):
        items = request.data.get("items", [])
        project_id = request.data.get("project_id")
        
        from project.models import Project
        project = None
        if project_id:
            try:
                project = Project.objects.get(id=project_id)
                # Clear existing BOMs for this project to ensure sync
                BOM.objects.filter(project=project).delete()
            except Project.DoesNotExist:
                pass

        if not items:
            return Response({"message": "BOM list cleared for project."}, status=status.HTTP_200_OK)
            
        company_id = request.user.id if request.user.is_authenticated else 1
        created = []
        for row in items:
            row = _enrich_bom_data(row)
            obj = BOM.objects.create(
                project=project,
                company_id=company_id,
                part_number=row.get("part_number", ""),
                part=row.get("part", ""),
                part_name=row.get("part_name", ""),
                category=row.get("category", ""),
                size=row.get("size", ""),
                grade_name=row.get("grade_name", row.get("material", "")),
                length_area=_parse_quantity("length_area", row),
                material=row.get("material"),
                quantity=_parse_quantity("quantity", row),
                quantity_type=row.get("quantity_type", ""),
                unit=row.get("unit", ""),
                date_of_requirement=_parse_date("date_of_requirement", row),
                source_file=row.get("source_file", "Batch upload"),
            )
            created.append(BOMSerializer(obj).data)
            
        return Response({
            "message": f"Successfully saved {len(created)} records.",
            "created_count": len(created)
        }, status=status.HTTP_201_CREATED)


class BOMListView(APIView):
    """List all BOM entries (GET) or create a single BOM record (POST)."""

    def get(self, request):
        company_id = request.user.id if request.user.is_authenticated else 1
        qs = BOM.objects.filter(company_id=company_id)
        project_id = request.query_params.get("project_id")
        if project_id:
            qs = qs.filter(project_id=project_id)
            
        has_quotations = request.query_params.get("has_quotations")
        if has_quotations == "true":
            from project.models import Quotation
            from django.db.models import Exists, OuterRef, Q, Value
            from django.db.models.functions import Concat
            
            # Subquery to check for quotations matching project and part specific details.
            # We match by part (formatted or raw), size, and material.
            quotes_subquery = Quotation.objects.filter(
                project_id=OuterRef('project_id'),
                size_spec__iexact=OuterRef('size'),
                material_name__iexact=OuterRef('material'),
                price__isnull=False
            ).filter(
                Q(part_name__iexact=OuterRef('part')) | 
                Q(part_name__iexact=OuterRef('part_number')) |
                Q(part_name__iexact=Concat(OuterRef('part_name'), Value('('), OuterRef('part'), Value(')')))
            )
            qs = qs.annotate(has_q=Exists(quotes_subquery)).filter(has_q=True)

        material = request.query_params.get("material")
        if material:
            qs = qs.filter(material__icontains=material)
        serializer = BOMSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Create a single BOM record from JSON body."""
        data = request.data
        material = (data.get("material") or "").strip()
        grade_name = (data.get("grade_name") or "").strip()
        if not material and grade_name:
            material = grade_name
        if not material:
            return Response(
                {"error": "Material is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        quantity = data.get("quantity")
        if quantity is None or quantity == "":
            quantity = 0
        try:
            quantity = float(quantity)
            if quantity < 0:
                quantity = 0
        except (TypeError, ValueError):
            quantity = 0
        date_str = data.get("date_of_requirement") or None
        date_of_requirement = None
        if date_str:
            from datetime import datetime
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
                try:
                    date_of_requirement = datetime.strptime(str(date_str).strip()[:10], fmt).date()
                    break
                except (ValueError, TypeError):
                    continue
        company_id = request.user.id if request.user.is_authenticated else 1
        data = _enrich_bom_data(data)
        obj = BOM.objects.create(
            company_id=company_id,
            part_number=(data.get("part_number") or "").strip(),
            part=(data.get("part") or "").strip(),
            part_name=data.get("part_name", ""),
            category=data.get("category", ""),
            size=(data.get("size") or "").strip(),
            grade_name=grade_name or material,
            length_area=_parse_quantity("length_area", data),
            material=material,
            quantity=quantity,
            quantity_type=data.get("quantity_type", ""),
            unit=data.get("unit", ""),
            date_of_requirement=date_of_requirement,
            source_file="Manual entry",
        )
        return Response(BOMSerializer(obj).data, status=status.HTTP_201_CREATED)


def _parse_quantity(data_key, data):
    quantity = data.get(data_key)
    if quantity is None or quantity == "":
        return 0
    try:
        quantity = float(quantity)
        return max(0, quantity)
    except (TypeError, ValueError):
        return 0


def _parse_date(data_key, data):
    date_str = data.get(data_key) or None
    if not date_str:
        return None
    from datetime import datetime
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(str(date_str).strip()[:10], fmt).date()
        except (ValueError, TypeError):
            continue
    return None


class BOMDetailView(APIView):
    """Retrieve, update, or delete a single BOM record."""

    def get_object(self, pk):
        from django.shortcuts import get_object_or_404
        return get_object_or_404(BOM, pk=pk)

    def get(self, request, pk):
        obj = self.get_object(pk)
        return Response(BOMSerializer(obj).data)

    def put(self, request, pk):
        obj = self.get_object(pk)
        data = request.data
        material = (data.get("material") or "").strip()
        if not material:
            return Response(
                {"error": "Material is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = _enrich_bom_data(data)
        obj.part_number = (data.get("part_number") or "").strip()
        obj.part = (data.get("part") or "").strip()
        obj.part_name = data.get("part_name", "")
        obj.category = data.get("category", "")
        obj.size = (data.get("size") or "").strip()
        obj.grade_name = (data.get("grade_name") or "").strip() or material
        obj.length_area = _parse_quantity("length_area", data)
        obj.material = material
        obj.quantity = _parse_quantity("quantity", data)
        obj.quantity_type = data.get("quantity_type", "")
        obj.unit = data.get("unit", "")
        obj.date_of_requirement = _parse_date("date_of_requirement", data)
        obj.save()
        return Response(BOMSerializer(obj).data)

    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class PartMasterListView(APIView):
    """Search PartMaster by code or name."""
    def get(self, request):
        from .models import PartMaster
        qs = PartMaster.objects.all()
        q = request.query_params.get("q")
        if q:
            from django.db.models import Q
            qs = qs.filter(Q(part__iexact=q.strip()) | Q(part_name__icontains=q.strip()))
        
        data = []
        for p in qs[:20]: # Limit results
            data.append({
                "part": p.part,
                "part_name": p.part_name,
                "category": p.category,
                "formatted": f"{p.part_name}({p.part})"
            })
        return Response(data)
