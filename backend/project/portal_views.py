from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Project, ProjectVendorAccess, Quotation
from vendor.models import VendorDetails, VendorMaterialInfo
from bom.models import BOM
import secrets
import string

def generate_password(length=12):
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for i in range(length))

class GeneratePortalAccessView(APIView):
    def post(self, request, project_id):
        project = get_object_or_404(Project, pk=project_id)
        vendors = request.data.get("vendors", []) # List of {vendor_id, email}
        
        results = []
        for v in vendors:
            v_id = v.get("vendor_id")
            email = v.get("email")
            if not v_id or not email: continue
            
            # Check if access already exists
            access, created = ProjectVendorAccess.objects.get_or_create(
                project=project,
                vendor_email=email,
                defaults={
                    'vendor_id': v_id,
                    'access_password': generate_password()
                }
            )
            
            results.append({
                "vendor_id": v_id,
                "email": email,
                "password": access.access_password,
                "project_name": project.name
            })
            
        return Response({"credentials": results})

class VendorPortalLoginView(APIView):
    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password")
        project_id = request.data.get("project_id")
        
        if not email or not password or not project_id:
            return Response({"error": "Please provide your email, project password, and project ID"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Match project first
            project = None
            if project_id and str(project_id).isdigit():
                project = Project.objects.filter(pk=project_id).first()
            
            if not project and project_id:
                # Fallback to name match
                project = Project.objects.filter(name=project_id).first()
                
            if not project:
                return Response({
                    "error": "Project not found. Please ensure you are using the exact portal link from your RFQ email."
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Find the specific vendor for this project (Case-Insensitive)
            access = ProjectVendorAccess.objects.filter(project=project, vendor_email__iexact=email).first()
            if not access:
                return Response({"error": "This email address is not authorized for this project portal."}, status=status.HTTP_403_FORBIDDEN)

            # Check password: Try individual access password first, then project password
            is_valid_pw = (password == access.access_password) or (password == project.project_password)
            
            if not is_valid_pw:
                return Response({"error": "Invalid password. Please check the credentials in your RFQ email."}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Record login activity
            from django.utils import timezone
            access.last_login = timezone.now()
            access.save()
            
            # Real-time Broadcast: Notify admin that vendor is now "Pending" (active login)
            from Calbuy_procurement.realtime import broadcast_company_event
            broadcast_company_event(
                company_id=project.company_id,
                action_type="quotation_updated",
                payload={"project_id": project.id, "vendor_id": access.vendor_id, "status": "Pending"},
                sender_id=None # Anonymous vendor
            )

            # Fetch vendor name
            vendor_name = "Verified Vendor"
            try:
                v_obj = VendorDetails.objects.filter(vendor_id=access.vendor_id).first()
                if v_obj:
                    vendor_name = v_obj.vendor_name
            except:
                pass

            return Response({
                "token": f"vendor-session-{access.id}-{secrets.token_hex(8)}",
                "vendor_id": access.vendor_id,
                "vendor_name": vendor_name,
                "project_id": project.id,
                "project_name": project.name,
                "success": True
            })
        except Exception as e:
            return Response({"error": f"Login processing error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RequiredItemsView(APIView):
    def get(self, request, project_id, vendor_id):
        # 1. Get the Project
        project = get_object_or_404(Project, pk=project_id)
        
        # 2. Get materials this vendor offers (cached/stored during match process or queried dynamically)
        # For now, let's query materials linked to this vendor
        vendor_materials = VendorMaterialInfo.objects.filter(vendor_id=vendor_id).values_list('material', flat=True)
        
        # 3. Find BOM items in this project that match those materials
        # Simple exact match or case-insensitive match
        bom_items = BOM.objects.filter(project=project, material__in=vendor_materials)
        
        # 4. Fetch deadlines from Quotation placeholders for this specific vendor/project
        quotes = Quotation.objects.filter(project=project, vendor_id=vendor_id)
        deadline_map = {q.material_name: q.submission_deadline for q in quotes}
        
        return Response([{
            "id": b.id,
            "material": b.material,
            "part_number": b.part_number,
            "quantity": b.quantity,
            "expected_date": b.date_of_requirement,
            "deadline": deadline_map.get(b.material) or project.created_at # Real deadline or project creation
        } for b in bom_items])

class VendorQuotationView(APIView):
    def get(self, request, project_id, vendor_id):
        # Fetch current quotations submitted by this vendor for this project
        quotes = Quotation.objects.filter(project_id=project_id, vendor_id=vendor_id)
        # In a real app, we'd also return the list of items they SHOULD quote for
        return Response([{
            "id": q.id,
            "material_name": q.material_name,
            "price": q.price,
            "lead_time": q.lead_time_days,
            "notes": q.notes,
            "submitted_at": q.submitted_at
        } for q in quotes])

    def post(self, request, project_id, vendor_id):
        # Submit or update a quotation
        project = get_object_or_404(Project, pk=project_id)
        data = request.data
        
        # In a real app, you'd use a Serializer
        quote, created = Quotation.objects.update_or_create(
            project=project,
            vendor_id=vendor_id,
            bom_item_id=data.get("bom_item_id", 0),
            material_name=data.get("material_name"), # Unique per material too
            defaults={
                "price": data.get("price"),
                "lead_time_days": data.get("lead_time"),
                "notes": f"Location: {data.get('location')}. {data.get('notes')}",
                "count": data.get("count"), # Assuming we add this field to Quotation model
                "company_id": project.company_id # Inherit from project
            }
        )
        
        # Real-time Broadcast: Notify admin that quotation was submitted
        from Calbuy_procurement.realtime import broadcast_company_event
        broadcast_company_event(
            company_id=project.company_id,
            action_type="quotation_updated",
            payload={"project_id": project.id, "vendor_id": vendor_id},
            sender_id=None
        )
        
        return Response({"message": "Quotation submitted successfully", "id": quote.id})
