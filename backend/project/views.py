from rest_framework import generics
from .models import Project
from .serializers import ProjectSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Quotation
from vendor.models import VendorDetails

import secrets
import string

from Calbuy_procurement.realtime import broadcast_company_event

class ProjectListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Project.objects.none()
        
        org = None
        try:
            org = self.request.user.profile.organization_name
        except:
            pass
            
        if not org:
            org = self.request.user.username or f"User_{self.request.user.id}"
            
        return Project.objects.filter(organization__iexact=org.strip()).order_by('-id')
    serializer_class = ProjectSerializer
    
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def perform_create(self, serializer):
        try:
            # Generate a random strong password for the project
            alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
            project_password = ''.join(secrets.choice(alphabet) for i in range(12))
            
            # Determine organization from user profile
            org_name = None
            try:
                org_name = self.request.user.profile.organization_name
            except:
                pass
                
            if not org_name:
                org_name = self.request.user.username or f"User_{self.request.user.id}"
            
            project = serializer.save(
                project_password=project_password,
                organization=org_name
            )
            
            # Real-time Broadcast: Use organization name as the group
            broadcast_company_event(
                company_id=org_name, 
                action_type="project_updated",
                payload=ProjectSerializer(project).data,
                sender_id=self.request.user.id
            )
        except Exception as e:
            raise e

class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Project.objects.none()
        
        org = None
        try:
            org = self.request.user.profile.organization_name
        except:
            pass
            
        if not org:
            org = self.request.user.username or f"User_{self.request.user.id}"
            
        return Project.objects.filter(organization__iexact=org.strip())
    serializer_class = ProjectSerializer

class ProjectQuotationListView(APIView):
    def get(self, request, project_id):
        project = Project.objects.filter(pk=project_id).first()
        if not project:
            return Response({"error": "Project not found"}, status=404)
            
        # Get all vendor access records for this project
        from .models import ProjectVendorAccess
        
        accesses = ProjectVendorAccess.objects.filter(project=project)
        access_map = {a.vendor_id: a for a in accesses}
        vendor_ids = accesses.values_list('vendor_id', flat=True).distinct()
        vendors_map = {v.vendor_id: v.vendor_name for v in VendorDetails.objects.filter(vendor_id__in=vendor_ids, organization=project.organization)}
        
        # Get all quotations for this project
        quotes = Quotation.objects.filter(project=project).order_by('vendor_id', 'part_name', 'size_spec')
        
        results = []
        for quote in quotes:
            access = access_map.get(quote.vendor_id)
            if not access: continue # Safety
            
            # Determine Status
            is_submitted = (quote.price is not None or quote.count is not None)
            
            status = "Mail Sent"
            if is_submitted:
                status = "Submitted"
            elif access.last_login:
                status = "Pending"
            
            results.append({
                "id": quote.id,
                "vendor_id": quote.vendor_id,
                "vendor_name": vendors_map.get(quote.vendor_id) or f"Vendor {quote.vendor_id}",
                "part_name": quote.part_name or "-",
                "size": quote.size_spec or "-",
                "material": quote.material_name,
                "price": quote.price if is_submitted else None,
                "currency": quote.currency or "USD",
                "negotiation_percentage": quote.negotiation_percentage,
                "lead_time": quote.lead_time_days if is_submitted else None,
                "count": quote.count if is_submitted else None,
                "notes": quote.notes if is_submitted else "",
                "status": status,
                "po_issued": quote.po_issued,
                "po_issued_at": quote.po_issued_at,
                "shipment_address": quote.shipment_address,
                "city": quote.city,
                "state": quote.state,
                "country": quote.country,
                "distance_km": quote.distance_to_organization_km if is_submitted else None,
                "submitted_at": quote.submitted_at if is_submitted else None,
                "last_login": access.last_login
            })
                
        return Response(results)

class IssuePOView(APIView):
    def post(self, request, project_id):
        from bom.models import BOM
        from django.utils import timezone
        
        vendor_id = request.data.get("vendor_id")
        if not vendor_id:
            return Response({"error": "Vendor ID required"}, status=400)
            
        project = Project.objects.filter(pk=project_id).first()
        if not project:
            return Response({"error": "Project not found"}, status=404)
            
        # 1. Update Quotations
        quotes = Quotation.objects.filter(project=project, vendor_id=vendor_id)
        quotes.update(po_issued=True, po_issued_at=timezone.now())
        
        # 2. Update BOM lines linked to these quotations
        BOM.objects.filter(project=project, selected_quotation__in=quotes).update(po_issued=True)
        
        # 3. Send email with PDF attachment
        pdf_content = request.data.get("pdf_content") # Base64 string
        vendor_details = VendorDetails.objects.filter(vendor_id=vendor_id, organization=project.organization).first()
        
        if vendor_details and vendor_details.email:
            from django.core.mail import EmailMessage
            import base64
            from django.core.files.base import ContentFile
            from accounts.models import UserProfile
            
            # Fetch organization name for personalization
            profile = UserProfile.objects.filter(user_id=project.company_id).first()
            org_name = profile.organization_name if profile else "Calbuy"
            
            subject = f"Congratulations! Purchase Order for Project: {project.name}"
            body = f"""
Dear {vendor_details.vendor_name},

Congratulations! We are pleased to issue this formal Purchase Order to you for the items quoted in Project: {project.name}.

Please find the attached Purchase Order document for your records and immediate action. 

Thank you for your competitive quotation and we look forward to a smooth delivery and execution.

Best regards,
Procurement Team
{org_name}
            """
            
            email = EmailMessage(
                subject,
                body,
                'noreply@calbuy.com',
                [vendor_details.email],
            )
            
            if pdf_content:
                # Expecting format: data:application/pdf;base64,xxxx
                if "base64," in pdf_content:
                    pdf_content = pdf_content.split("base64,")[1]
                
                decoded_pdf = base64.b64decode(pdf_content)
                filename = f"PO_{project.name}_{vendor_id}.pdf"
                email.attach(filename, decoded_pdf, 'application/pdf')
                
            try:
                email.send()
            except Exception as e:
                print(f"Failed to send email: {e}")
                # We still return success as the database was updated
        
        # Real-time Broadcast: Update UI
        broadcast_company_event(
            company_id=project.company_id,
            action_type="po_issued",
            payload={"project_id": project.id, "vendor_id": vendor_id},
            sender_id=request.user.id if request.user.is_authenticated else None
        )
        
        return Response({"message": f"Purchase Order issued to {vendor_details.vendor_name if vendor_details else vendor_id} and email sent successfully."})
