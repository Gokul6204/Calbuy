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

ALLOWED_EXTENSIONS = {"xlsx", "xls", "csv", "pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


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
            
        created = []
        for row in items:
            obj = BOM.objects.create(
                project=project,
                bom_id=row.get("bom_id"),
                part_number=row.get("part_number", ""),
                material=row.get("material"),
                quantity=_parse_quantity("quantity", row),
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
        qs = BOM.objects.all()
        project_id = request.query_params.get("project_id")
        if project_id:
            qs = qs.filter(project_id=project_id)
        bom_id = request.query_params.get("bom_id")
        if bom_id:
            qs = qs.filter(bom_id__icontains=bom_id)
        material = request.query_params.get("material")
        if material:
            qs = qs.filter(material__icontains=material)
        serializer = BOMSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Create a single BOM record from JSON body."""
        data = request.data
        bom_id = (data.get("bom_id") or "").strip()
        material = (data.get("material") or "").strip()
        if not bom_id or not material:
            return Response(
                {"error": "bom_id and material are required."},
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
        obj = BOM.objects.create(
            bom_id=bom_id,
            part_number=(data.get("part_number") or "").strip(),
            material=material,
            quantity=quantity,
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
        bom_id = (data.get("bom_id") or "").strip()
        material = (data.get("material") or "").strip()
        if not bom_id or not material:
            return Response(
                {"error": "bom_id and material are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj.bom_id = bom_id
        obj.part_number = (data.get("part_number") or "").strip()
        obj.material = material
        obj.quantity = _parse_quantity("quantity", data)
        obj.date_of_requirement = _parse_date("date_of_requirement", data)
        obj.save()
        return Response(BOMSerializer(obj).data)

    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
