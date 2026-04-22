from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Project, ProjectVendorAccess, Quotation
from vendor.models import VendorDetails, VendorMaterialInfo
from bom.models import BOM
import secrets
import string
import logging

logger = logging.getLogger(__name__)

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
                    "error": "Project not found. Please ensure you are using the exact portal link from your RFQ email./Project Might be deleted or archived"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Find the specific vendor for this project (Case-Insensitive)
            access = ProjectVendorAccess.objects.filter(project=project, vendor_email__iexact=email).first()
            if not access:
                return Response({"error": "This email address is not authorized for this project portal."}, status=status.HTTP_403_FORBIDDEN)

            # Check password: Try individual access password first, then project password
            is_valid_pw = (password == access.access_password) or (password == project.project_password)
            
            if not is_valid_pw:
                return Response({"error": "Invalid password for this project. Please check the credentials in your RFQ email."}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Record login activity
            from django.utils import timezone
            access.last_login = timezone.now()
            access.save()
            
            # Real-time Broadcast: Use organization name
            from Calbuy_procurement.realtime import broadcast_company_event
            broadcast_company_event(
                company_id=project.organization,
                action_type="quotation_updated",
                payload={"project_id": project.id, "vendor_id": access.vendor_id, "status": "Pending"},
                sender_id=None # Anonymous vendor
            )

            # Fetch vendor name (Isolated by organization)
            vendor_name = "Verified Vendor"
            try:
                v_obj = VendorDetails.objects.filter(vendor_id=access.vendor_id, organization=project.organization).first()
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

        # 2. Get vendor's category to match against BOM categories
        from django.db.models import Q
        try:
            vendor_obj = VendorDetails.objects.filter(vendor_id=vendor_id).first()
            vendor_category = (vendor_obj.category or '').strip() if vendor_obj else ''
        except Exception:
            vendor_category = ''

        # 3. Find BOM items in this project
        # Priority 1: Specific placeholders created during RFQ sending
        quoted_bom_ids = Quotation.objects.filter(
            project=project, vendor_id=vendor_id
        ).exclude(bom_item_id=None).values_list('bom_item_id', flat=True)

        if quoted_bom_ids.exists():
            bom_items = BOM.objects.filter(project=project, id__in=quoted_bom_ids)
        elif vendor_category:
            # Priority 2: Category match (Legacy/General access)
            bom_items = BOM.objects.filter(
                project=project,
                category__iexact=vendor_category
            )
        else:
            bom_items = BOM.objects.none()

        # 4. Group by (Part name, Size, Grade) — use correct BOM field names
        graded_data = {}
        for item in bom_items:
            # formatted_part gives "PARTNAME(PART)" e.g. "PLATE(PL)"
            part_key = item.formatted_part or (item.part or item.part_number or 'Unknown').strip()
            size_key = (item.size or 'N/A').strip()
            # Use grade_name (the actual grade field) with material as fallback
            mat_key = (item.grade_name or item.material or 'N/A').strip()

            combo_key = f"{part_key}||{size_key}||{mat_key}"

            if combo_key not in graded_data:
                graded_data[combo_key] = {
                    'part_name': part_key,
                    'size_spec': size_key,
                    'material_grade': mat_key,
                    'total_quantity': 0,
                    'total_length_area': 0,
                    'required_date': None,
                    'unit': item.unit or 'nos',
                    'items': []
                }

            qty = 0
            len_area = 0
            try:
                qty = float(item.quantity or 0)
                len_area = float(item.length_area or 0)
            except Exception:
                pass

            # Aggregate date (take the earliest if multiple)
            if item.date_of_requirement:
                date_str = item.date_of_requirement.strftime('%Y-%m-%d')
                if not graded_data[combo_key]['required_date']:
                    graded_data[combo_key]['required_date'] = date_str
                elif date_str < graded_data[combo_key]['required_date']:
                    graded_data[combo_key]['required_date'] = date_str

            graded_data[combo_key]['total_quantity'] += qty
            graded_data[combo_key]['total_length_area'] += len_area
            graded_data[combo_key]['items'].append({
                'size': item.size,
                'grade': item.grade_name or item.material,
                'quantity': str(item.quantity),
                'quantity_type': item.quantity_type,
                'unit': item.unit,
                'length_area': str(item.length_area),
                'date_of_requirement': item.date_of_requirement.strftime('%Y-%m-%d') if item.date_of_requirement else None,
                'id': item.id
            })

        # Find any existing quotes for these combinations
        quotes = Quotation.objects.filter(project=project, vendor_id=vendor_id)
        quote_lookup = {}
        for q in quotes:
            # Match by exactly what we Grouped by
            q_key = f"{q.part_name}||{q.size_spec}||{q.material_name}"
            quote_lookup[q_key] = q
            
        final_list = []
        for key, data in graded_data.items():
            quote = quote_lookup.get(key)
            status = 'pending'
            price = None
            count = None
            lead_time = None
            notes = ""
            quote_id = None
            
            currency = 'USD'
            negotiation_percentage = None
            shipment_address = ""
            city = ""
            state = ""
            country = ""
            pincode = ""
            
            if quote:
                if quote.price is not None or quote.count is not None:
                    status = 'submitted'
                    price = str(quote.price)
                    count = quote.count
                    lead_time = quote.lead_time_days
                    notes = quote.notes
                    quote_id = quote.id
                    currency = quote.currency
                    negotiation_percentage = str(quote.negotiation_percentage) if quote.negotiation_percentage else None
                    shipment_address = quote.shipment_address or quote.shipment_from_location
                    city = quote.city
                    state = quote.state
                    country = quote.country
                    pincode = quote.pincode

            final_list.append({
                'part_name': data['part_name'],
                'size': data['size_spec'],
                'material': data['material_grade'],
                'total_quantity': data['total_quantity'],
                'total_length_area': data['total_length_area'],
                'required_date': data['required_date'],
                'unit': data['unit'],
                'items': data['items'],
                'status': status,
                'price': price,
                'count': count,
                'lead_time': lead_time,
                'notes': notes,
                'currency': currency,
                'negotiation_percentage': negotiation_percentage,
                'shipment_address': shipment_address,
                'city': city,
                'state': state,
                'country': country,
                'pincode': pincode,
                'existing_quote_id': quote_id,
                'deadline': quote.submission_deadline if quote else None
            })

        return Response(final_list)

class VendorQuotationView(APIView):
    def get(self, request, project_id, vendor_id):
        # Fetch current quotations submitted by this vendor for this project
        quotes = Quotation.objects.filter(project_id=project_id, vendor_id=vendor_id)
        return Response([{
            "id": q.id,
            "part_name": q.part_name,
            "size_spec": q.size_spec,
            "material_name": q.material_name,
            "price": str(q.price) if q.price is not None else None,
            "currency": q.currency or "USD",
            "negotiation_percentage": str(q.negotiation_percentage) if q.negotiation_percentage else None,
            "lead_time": q.lead_time_days,
            "notes": q.notes,
            "submitted_at": q.submitted_at
        } for q in quotes])

    def post(self, request, project_id, vendor_id):
        # Submit or update a quotation
        project = get_object_or_404(Project, pk=project_id)
        data = request.data
        
        # Match by (Part, Size, Material)
        part_name = data.get("part_number")
        size_spec = data.get("size_spec")
        material_name = data.get("material_name")

        quote = Quotation.objects.filter(
            project=project,
            vendor_id=vendor_id,
            part_name__iexact=part_name,
            size_spec__iexact=size_spec,
            material_name__iexact=material_name
        ).first()

        shipment_address=data.get("shipment_address")
        city=data.get("city")
        state=data.get("state")
        country=data.get("country")
        pincode=data.get("pincode")

        lat, lon, distance = None, None, None
        address_parts = [shipment_address, city, state, country, pincode]
        if any(p and str(p).strip() for p in address_parts):
            from Calbuy_procurement.geocoding import get_geocode, calculate_distance_km
            from accounts.models import UserProfile
            try:
                # 1. Geocode the vendor's shipment location (origin)
                lat, lon = get_geocode(shipment_address or '', city or '', state or '', country or '', pincode or '')
            except Exception:
                pass 
            
            if lat and lon:
                try:
                    # 2. Find the Buyer's Organization location (destination)
                    profile = UserProfile.objects.get(user_id=project.company_id)
                    dest_lat = profile.latitude
                    dest_lon = profile.longitude
                    
                    # If organization hasn't geocoded their own profile yet, do it now
                    if not dest_lat or not dest_lon:
                        try:
                            dest_lat, dest_lon = get_geocode(
                                profile.address or '', 
                                profile.city or '', 
                                profile.state or '', 
                                profile.country or '',
                                profile.pincode or ''
                            )
                            # Save back to profile for future use
                            profile.latitude = dest_lat
                            profile.longitude = dest_lon
                            profile.save()
                        except Exception:
                            pass
                    
                    if dest_lat and dest_lon:
                        # 3. Calculate road-accurate distance
                        distance = calculate_distance_km(lat, lon, dest_lat, dest_lon)
                except Exception as e:
                    logger.error(f"Error calculating distance to organization: {str(e)}")
                    pass

        def safe_float(val):
            try:
                if val is None or str(val).strip() == "": return None
                return float(val)
            except (ValueError, TypeError):
                return None

        price_val = safe_float(data.get("price"))
        nego_val = safe_float(data.get("negotiation_percentage"))

        if quote:
            # Update existing placeholder or previous submission
            quote.price = price_val
            quote.currency = data.get("currency", "USD")
            quote.negotiation_percentage = nego_val
            quote.lead_time_days = data.get("lead_time")
            quote.notes = data.get('notes')
            quote.count = data.get("count")
            quote.shipment_address = shipment_address
            quote.city = city
            quote.state = state
            quote.country = country
            quote.pincode = pincode
            if lat and lon:
                quote.latitude = lat
                quote.longitude = lon
            if distance is not None:
                quote.distance_to_organization_km = distance
            quote.save()
        else:
            # Create a brand new one if no placeholder exists
            quote = Quotation.objects.create(
                project=project,
                vendor_id=vendor_id,
                material_name=material_name,
                part_name=part_name,
                size_spec=size_spec,
                price=price_val,
                currency=data.get("currency", "USD"),
                negotiation_percentage=nego_val,
                lead_time_days=data.get("lead_time"),
                notes=data.get('notes'),
                count=data.get("count"),
                shipment_address=shipment_address,
                city=city,
                state=state,
                country=country,
                pincode=pincode,
                latitude=lat,
                longitude=lon,
                distance_to_organization_km=distance,
                company_id=project.company_id,
                organization=project.organization
            )
        
        # Real-time Broadcast: Use organization name
        from Calbuy_procurement.realtime import broadcast_company_event
        broadcast_company_event(
            company_id=project.organization,
            action_type="quotation_updated",
            payload={"project_id": project.id, "vendor_id": vendor_id},
            sender_id=None
        )
        
        return Response({"message": "Quotation submitted successfully", "id": quote.id})
