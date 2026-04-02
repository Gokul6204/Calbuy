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

class SendRfqEmailView(APIView):
    def post(self, request):
        rfqs = request.data.get("rfqs", [])
        if not rfqs:
            return Response({"error": "No RFQs provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        sent_count = 0
        for rfq in rfqs:
            subject = rfq.get("subject", "Request for Quotation")
            body = rfq.get("body", "")
            vendors = rfq.get("vendors", [])
            for vendor_info in vendors:
                vendor_id = vendor_info.get("vendor_id")
                try:
                    vendor = VendorDetails.objects.get(vendor_id=vendor_id)
                    to_email = vendor.email
                    if to_email and to_email.lower() != "unknown" and "@" in to_email:
                        send_mail(
                            subject,
                            body,
                            getattr(settings, 'DEFAULT_FROM_EMAIL', 'procurement@calbuy.com'),
                            [to_email],
                            fail_silently=False,
                        )
                        sent_count += 1
                except VendorDetails.DoesNotExist:
                    continue
        
        return Response({"message": f"Sent {sent_count} emails successfully."})

class VendorListCreateView(APIView):
    """List vendors (GET) or create a vendor (POST)."""

    def get(self, request):
        qs = VendorDetails.objects.all()
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
            vendor = serializer.save()
        except IntegrityError:
            return Response(
                {"error": "vendor_id already exists."},
                status=status.HTTP_400_BAD_REQUEST,
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
        except IntegrityError:
            return Response(
                {"error": "vendor_id already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(VendorDetailsSerializer(vendor).data)

    def delete(self, request, pk):
        vendor = get_object_or_404(VendorDetails, pk=pk)
        vendor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class VendorMaterialListCreateView(APIView):
    """List/Create vendor materials for a vendor."""

    def get(self, request, vendor_pk):
        vendor = get_object_or_404(VendorDetails, pk=vendor_pk)
        qs = VendorMaterialInfo.objects.filter(vendor=vendor)
        return Response(VendorMaterialInfoSerializer(qs, many=True).data)

    def post(self, request, vendor_pk):
        vendor = get_object_or_404(VendorDetails, pk=vendor_pk)
        material = (request.data.get("material") or "").strip()
        if not material:
            return Response({"error": "material is required."}, status=status.HTTP_400_BAD_REQUEST)
        obj = VendorMaterialInfo.objects.create(vendor=vendor, material=material)
        return Response(VendorMaterialInfoSerializer(obj).data, status=status.HTTP_201_CREATED)


class VendorMaterialDetailView(APIView):
    """Update/Delete a vendor material row."""

    def put(self, request, pk):
        obj = get_object_or_404(VendorMaterialInfo, pk=pk)
        material = (request.data.get("material") or "").strip()
        if not material:
            return Response({"error": "material is required."}, status=status.HTTP_400_BAD_REQUEST)
        obj.material = material
        obj.save()
        return Response(VendorMaterialInfoSerializer(obj).data)

    def delete(self, request, pk):
        obj = get_object_or_404(VendorMaterialInfo, pk=pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MatchVendorsView(APIView):
    """Return vendors matching a list of materials."""

    def post(self, request):
        materials = request.data.get("materials", [])
        location = request.data.get("location", "")
        if not materials:
            return Response([])

        from django.db.models import Q
        query = Q()
        for m in materials:
            query |= Q(material__iexact=m.strip())
        matching_v_materials = VendorMaterialInfo.objects.filter(query)
        
        # Get unique vendors from these materials
        v_ids = matching_v_materials.values_list("vendor_id", flat=True)
        vendors_qs = VendorDetails.objects.filter(vendor_id__in=v_ids)
        
        if location:
            vendors_qs = vendors_qs.filter(location__icontains=location.strip())
            
        vendors = vendors_qs.distinct()

        materials_map = {}
        for vm in matching_v_materials:
            v_id = vm.vendor_id
            if v_id not in materials_map:
                materials_map[v_id] = []
            if vm.material not in materials_map[v_id]:
                materials_map[v_id].append(vm.material)

        vendors_data = VendorDetailsSerializer(vendors, many=True).data
        for v in vendors_data:
            v["matched_materials"] = materials_map.get(v["vendor_id"], [])

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
        
        for row in rows:
            vendor_id = row.get("vendor_id")
            if not vendor_id: continue
            
            try:
                # Use update_or_create to handle potential existing entries? 
                # Or just skip/error. Let's try update_or_create to be helpful.
                obj, is_new = VendorDetails.objects.update_or_create(
                vendor_id=vendor_id,
                defaults={
                    "vendor_name": row.get("vendor_name", "unknown"),
                    "mobile_number": row.get("mobile_number", "unknown"),
                    "email": row.get("email", "unknown"),
                    "location": row.get("location", "unknown"),
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
