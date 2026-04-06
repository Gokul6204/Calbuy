from rest_framework import generics
from .models import Project
from .serializers import ProjectSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Quotation
from vendor.models import VendorDetails

import secrets
import string

class ProjectListCreateView(generics.ListCreateAPIView):
    queryset = Project.objects.all().order_by('-id')
    serializer_class = ProjectSerializer
    
    def perform_create(self, serializer):
        # Generate a random strong password for the project
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        project_password = ''.join(secrets.choice(alphabet) for i in range(12))
        serializer.save(project_password=project_password)

class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

class ProjectQuotationListView(APIView):
    def get(self, request, project_id):
        project = Project.objects.filter(pk=project_id).first()
        if not project:
            return Response({"error": "Project not found"}, status=404)
            
        # Get all vendor access records for this project
        from .models import ProjectVendorAccess
        from vendor.models import VendorMaterialInfo
        from bom.models import BOM
        
        accesses = ProjectVendorAccess.objects.filter(project=project)
        vendor_ids = accesses.values_list('vendor_id', flat=True).distinct()
        vendors_map = {v.vendor_id: v.vendor_name for v in VendorDetails.objects.filter(vendor_id__in=vendor_ids)}
        
        # Get all quotations for this project
        quotes = Quotation.objects.filter(project=project)
        # Map quotes by (vendor_id, material_name)
        quote_map = {(q.vendor_id, q.material_name): q for q in quotes}
        
        # Group by vendor -> Materials
        results = []
        for access in accesses:
            # Find what materials this vendor should quote (matched in BOM)
            vendor_materials = VendorMaterialInfo.objects.filter(vendor_id=access.vendor_id).values_list('material', flat=True)
            bom_items = BOM.objects.filter(project=project, material__in=vendor_materials).values_list('material', flat=True).distinct()
            
            for mat in bom_items:
                quote = quote_map.get((access.vendor_id, mat))
                
                # Determine Status
                # Mail Sent: Exists in ProjectVendorAccess but no login yet
                # Pending: Logged in (last_login exists) but no Quote with price/data
                # Submitted: Quote exists and has price/data
                
                # We check for price or count to determine if it was actually submitted,
                # because we create "placeholder" quotes to store deadlines.
                is_submitted = quote and (quote.price is not None or quote.count is not None)
                
                status = "Mail Sent"
                if is_submitted:
                    status = "Submitted"
                elif access.last_login:
                    status = "Pending"
                
                results.append({
                    "id": quote.id if quote else f"p-{access.id}-{mat}",
                    "vendor_id": access.vendor_id,
                    "vendor_name": vendors_map.get(access.vendor_id, "Unknown Vendor"),
                    "material": mat,
                    "price": quote.price if is_submitted else None,
                    "lead_time": quote.lead_time_days if is_submitted else None,
                    "count": quote.count if is_submitted else None,
                    "notes": quote.notes if is_submitted else "",
                    "status": status,
                    "submitted_at": quote.submitted_at if is_submitted else None,
                    "last_login": access.last_login
                })
                
        # Also include any quotations that might not match the current BOM items (legacy quotes)
        # ... logic if needed, but for now we follow the invite list.
        
        return Response(results)
