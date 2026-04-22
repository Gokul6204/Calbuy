from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from django.db import IntegrityError
from django.shortcuts import get_object_or_404

from .models import VendorDetails, VendorMaterialInfo
from .serializers import VendorDetailsSerializer, VendorMaterialInfoSerializer
from .parsers import parse_file
from django.core.mail import send_mail
from django.conf import settings
from project.models import Project, ProjectVendorAccess, Quotation
import string
import secrets

def generate_password(length=12):
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for i in range(length))

class SendRfqEmailView(APIView):
    def post(self, request):
        rfqs = request.data.get("rfqs", [])
        project_id = request.data.get("project_id")
        
        if not rfqs:
            return Response({"error": "No RFQs provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        sent_count = 0
        for rfq in rfqs:
            subject = rfq.get("subject", "Request for Quotation")
            original_body = rfq.get("body", "")
            vendors = rfq.get("vendors", [])
            
            for vendor_info in vendors:
                v_id = vendor_info.get("vendor_id")
                try:
                    vendor = VendorDetails.objects.get(vendor_id=v_id)
                    to_email = vendor.email
                    if to_email and to_email.lower() != "unknown" and "@" in to_email:
                        # Replace placeholders with actual vendor info
                        deadline_val = rfq.get("deadline", "Not specified")
                        vendor_body = original_body.replace("[Your Registered Email]", to_email)
                        vendor_body = vendor_body.replace("[Submission Deadline]", str(deadline_val))
                        
                        # Ensure portal access exists if project_id is provided
                        if project_id:
                            try:
                                project = Project.objects.get(pk=project_id)
                                access, created = ProjectVendorAccess.objects.get_or_create(
                                    project=project,
                                    vendor_email=to_email,
                                    defaults={
                                        'vendor_id': v_id,
                                        'access_password': generate_password()
                                    }
                                )
                                # Replace password placeholder
                                vendor_body = vendor_body.replace("[Your Portal Password]", access.access_password)
                                
                                # Create granular quotation rows if provided
                                granular_items = rfq.get("granular_items", [])
                                if granular_items:
                                    for item in granular_items:
                                        # Associated this item with the current vendor getting the email
                                        
                                        p_name = item.get("formatted_part") or item.get("part")
                                        s_spec = item.get("size")
                                        m_name = item.get("grade_name") or item.get("material")
                                        
                                        # Determine organization from project
                                        org_name = project.organization if project else None
                                        
                                        # Use exactly matched combination
                                        Quotation.objects.update_or_create(
                                            project=project,
                                            vendor_id=v_id,
                                            part_name=p_name,
                                            size_spec=s_spec,
                                            material_name=m_name,
                                            organization=org_name,
                                            bom_item_id=item.get("id"),
                                            defaults={
                                                'submission_deadline': rfq.get("deadline")
                                            }
                                        )
                                else:
                                    # Legacy / fallback to part-only Gradeing
                                    deadline_val = rfq.get("deadline")
                                    if deadline_val:
                                        material = rfq.get("material", "unknown")
                                        Quotation.objects.update_or_create(
                                            project=project,
                                            vendor_id=v_id,
                                            material_name__iexact=material,
                                            organization=project.organization if project else None,
                                            defaults={
                                                'submission_deadline': deadline_val,
                                                'part_name': material # Fallback part name
                                            }
                                        )
                            except Project.DoesNotExist:
                                pass

                        send_mail(
                            subject,
                            vendor_body,
                            getattr(settings, 'DEFAULT_FROM_EMAIL', 'procurement@calbuy.com'),
                            [to_email],
                            fail_silently=False,
                        )
                        sent_count += 1
                except VendorDetails.DoesNotExist:
                    continue
        
        return Response({"message": f"Sent {sent_count} emails successfully."})

from Calbuy_procurement.realtime import broadcast_company_event

class VendorListCreateView(APIView):
    """List vendors (GET) or create a vendor (POST)."""

    def get(self, request):
        if not request.user.is_authenticated:
            return Response([])
            
        org = None
        try:
            org = request.user.profile.organization_name
        except:
            pass
            
        if not org:
            org = request.user.username or f"User_{request.user.id}"
            
        qs = VendorDetails.objects.filter(organization__iexact=org.strip())

        vendor_id = request.query_params.get("vendor_id")
        if vendor_id:
            qs = qs.filter(vendor_id__icontains=vendor_id)
        vendor_name = request.query_params.get("vendor_name")
        if vendor_name:
            qs = qs.filter(vendor_name__icontains=vendor_name)
        return Response(VendorDetailsSerializer(qs, many=True).data)

    def post(self, request):
        serializer = VendorDetailsSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            # Determine organization from user profile
            org_name = None
            try:
                org_name = request.user.profile.organization_name
            except:
                pass
            
            if not org_name:
                org_name = request.user.username or f"User_{request.user.id}"
            
            company_id = request.user.id if request.user.is_authenticated else 1
            
            # Geocoding and distance calculation
            from Calbuy_procurement.geocoding import get_geocode, calculate_distance_km
            from accounts.models import UserProfile
            
            lat, lon = getattr(serializer.validated_data, 'latitude', None), getattr(serializer.validated_data, 'longitude', None)
            address_parts = [
                serializer.validated_data.get('address', ''),
                serializer.validated_data.get('city', ''),
                serializer.validated_data.get('state', ''),
                serializer.validated_data.get('country', '')
            ]
            
            if any(address_parts):
                try:
                    lat, lon = get_geocode(*address_parts)
                except Exception as e:
                    pass # Silently fail geocoding, stick to none
            
            distance = None
            if lat and lon:
                user_id = request.user.id if request.user.is_authenticated else 1
                try:
                    profile = UserProfile.objects.get(user_id=user_id)
                    if profile.latitude and profile.longitude:
                        distance = calculate_distance_km(lat, lon, profile.latitude, profile.longitude)
                except UserProfile.DoesNotExist:
                    pass
                    
            vendor = serializer.save(
                organization=org_name,
                latitude=lat,
                longitude=lon,
                distance_to_organization_km=distance
            )
            
            # Real-time Broadcast: Use organization name
            broadcast_company_event(
                company_id=org_name,
                action_type="vendor_updated",
                payload=VendorDetailsSerializer(vendor).data,
                sender_id=request.user.id
            )
        except IntegrityError as e:
            return Response(
                {"error": f"Database integrity error: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": f"Internal server error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(VendorDetailsSerializer(vendor).data, status=status.HTTP_201_CREATED)


class VendorDetailView(APIView):
    """Retrieve/Update/Delete a vendor."""

    def get(self, request, pk):
        vendor = get_object_or_404(VendorDetails, pk=pk)
        return Response(VendorDetailsSerializer(vendor).data)

    def put(self, request, pk):
        vendor = get_object_or_404(VendorDetails, pk=pk)
        serializer = VendorDetailsSerializer(vendor, data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            vendor = serializer.save()
            # Real-time Broadcast: Use organization name
            broadcast_company_event(
                company_id=vendor.organization,
                action_type="vendor_updated",
                payload=VendorDetailsSerializer(vendor).data,
                sender_id=request.user.id
            )
        except IntegrityError:
            return Response(
                {"error": "vendor_id already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(VendorDetailsSerializer(vendor).data)

    def delete(self, request, pk):
        vendor = get_object_or_404(VendorDetails, pk=pk)
        company_id = vendor.company_id
        vendor_id = vendor.vendor_id
        vendor.delete()
        # Real-time Broadcast
        broadcast_company_event(
            company_id=company_id,
            action_type="vendor_deleted",
            payload={"id": pk, "vendor_id": vendor_id},
            sender_id=request.user.id if request.user.is_authenticated else None
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class VendorMaterialListCreateView(APIView):
    """List/Create vendor materials for a vendor."""

    def get(self, request, vendor_pk):
        vendor = get_object_or_404(VendorDetails, pk=vendor_pk)
        qs = VendorMaterialInfo.objects.filter(vendor=vendor)
        return Response(VendorMaterialInfoSerializer(qs, many=True).data)

    def post(self, request, vendor_pk):
        vendor = get_object_or_404(VendorDetails, pk=vendor_pk)
        part = (request.data.get("part") or "").strip()
        if not part:
            return Response({"error": "part is required."}, status=status.HTTP_400_BAD_REQUEST)
        obj = VendorMaterialInfo.objects.create(
            vendor=vendor, 
            part=part
        )
        return Response(VendorMaterialInfoSerializer(obj).data, status=status.HTTP_201_CREATED)


class VendorMaterialDetailView(APIView):
    """Update/Delete a vendor material row."""

    def put(self, request, pk):
        obj = get_object_or_404(VendorMaterialInfo, pk=pk)
        part = (request.data.get("part") or "").strip()
        if not part:
            return Response({"error": "part is required."}, status=status.HTTP_400_BAD_REQUEST)
        obj.part = part
        obj.save()
        return Response(VendorMaterialInfoSerializer(obj).data)

    def delete(self, request, pk):
        obj = get_object_or_404(VendorMaterialInfo, pk=pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MatchVendorsView(APIView):
    """Return vendors matching a list of categories."""

    def post(self, request):
        categories = request.data.get("categories", [])
        location = request.data.get("location", "")
        
        # If no categories provided, try materials for backward compatibility
        if not categories:
            materials = request.data.get("materials", [])
            if not materials:
                return Response([])
            # Lookup categories for these materials if they aren't provided
            from bom.models import PartMaster
            found_cats = PartMaster.objects.filter(part__in=materials).values_list('category', flat=True)
            categories = list(set(found_cats))

        if not categories:
            return Response([])

        from django.db.models import Q
        query = Q()
        for cat in categories:
            query |= Q(category__iexact=cat.strip())
        
        # Filter by organization
        try:
            org = request.user.profile.organization_name
            vendors_qs = VendorDetails.objects.filter(query, organization=org, is_active=True)
        except:
            company_id = request.user.id if request.user.is_authenticated else 1
            vendors_qs = VendorDetails.objects.filter(query, company_id=company_id, is_active=True)
        
        if location:
            vendors_qs = vendors_qs.filter(Q(city__icontains=location.strip()) | Q(state__icontains=location.strip()) | Q(country__icontains=location.strip()))
            
        vendors = vendors_qs.distinct()

        # Enrichment with matched categories and parts
        vendors_data = VendorDetailsSerializer(vendors, many=True).data
        from .models import VendorMaterialInfo
        
        # Get all parts for these vendors at once for efficiency
        v_ids = [v["id"] for v in vendors_data]
        all_v_parts = VendorMaterialInfo.objects.filter(vendor_id__in=v_ids)
        
        # Create a mapping of vendor_id -> list of parts
        parts_map = {}
        for vp in all_v_parts:
            if vp.vendor_id not in parts_map:
                parts_map[vp.vendor_id] = []
            parts_map[vp.vendor_id].append(vp.part)

        # Get relevant parts from request if possible (bom materials/parts)
        request_parts = request.data.get("materials", [])
        request_parts_lower = [p.strip().lower() for p in request_parts]

        for v in vendors_data:
            v_id = v.get("id")
            
            # Matched Category - based on organization's category matching the request
            v_cat = (v.get("category") or "").strip().lower()
            v["matched_materials"] = [cat for cat in categories if cat.strip().lower() == v_cat]
            
            # Matched Parts - parts that the vendor has which were in the request
            v_all_parts = parts_map.get(v_id, [])
            v["matched_parts"] = [p for p in v_all_parts if p.strip().lower() in request_parts_lower]
            
            # If no intersection but vendor has parts, might want to show them? 
            # For now, let's just stick to the intersection as "matched_parts"
            # But the user also wants to list parts the vendor holds.
            v["all_parts"] = v_all_parts

        return Response(vendors_data)


class VendorUploadView(APIView):
    """
    Handle vendor file uploads (XLSX, CSV, PDF).
    Returns info on created vendors.
    """
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        filename = (file_obj.name or "").lower()
        content = file_obj.read()
        
        try:
            rows = parse_file(content, filename)
        except Exception as e:
            return Response({"error": f"Failed to parse: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not rows:
            return Response({"error": "No vendors found in file."}, status=status.HTTP_400_BAD_REQUEST)
            
        created = []
        skipped = []
        company_id = request.user.id if request.user.is_authenticated else 1
        
        # Determine organization from user profile
        org_name = None
        try:
            org_name = request.user.profile.organization_name
        except:
            pass

        for row in rows:
            vendor_id = row.get("vendor_id")
            if not vendor_id: 
                continue
            
            try:
                # Use update_or_create to handle potential existing entries
                obj, is_new = VendorDetails.objects.update_or_create(
                    vendor_id=vendor_id,
                    organization=org_name,
                    defaults={
                        "company_id": company_id,
                        "vendor_name": row.get("vendor_name", "unknown"),
                        "mobile_number": row.get("mobile_number", "unknown"),
                        "email": row.get("email", "unknown"),
                        "city": row.get("city", row.get("location", "unknown")),
                        "address": row.get("address", "unknown"),
                    }
                )
                created.append(VendorDetailsSerializer(obj).data)
            except Exception as e:
                skipped.append({"vendor_id": vendor_id, "error": str(e)})
                
        return Response({
            "message": f"Processed {len(rows)} rows. Created/Updated {len(created)} vendors.",
            "created": created,
            "skipped": skipped
        }, status=status.HTTP_201_CREATED)
