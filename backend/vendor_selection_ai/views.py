from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from project.models import Project, Quotation
from bom.models import BOM
from vendor.models import VendorDetails
from accounts.models import UserProfile
from .ranking_service import VendorRankingService
from Calbuy_procurement.realtime import broadcast_company_event

from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework.authentication import SessionAuthentication, BasicAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return  # Do not perform CSRF check

@method_decorator(csrf_exempt, name='dispatch')
class VendorRankingView(APIView):
    authentication_classes = (CsrfExemptSessionAuthentication, BasicAuthentication)
    """
    API endpoint to rank vendors for a specific BOM item using AI.
    """
    def get(self, request):
        bom_item_id = request.query_params.get('bom_item_id')
        project_id = request.query_params.get('project_id')

        if not bom_item_id or not project_id:
            return Response(
                {"error": "bom_item_id and project_id are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Cast to integers to prevent lookup errors
            b_id = int(bom_item_id)
            p_id = int(project_id)

            # 1. Fetch relevant BOM data
            bom_item = BOM.objects.get(id=b_id)
            project = Project.objects.get(id=p_id)
            
            # 2. Get User/Buyer location (from Profile)
            org_location = "Mumbai" # Default
            if request.user.is_authenticated:
                user_profile = UserProfile.objects.filter(user=request.user).first()
                if user_profile:
                    org_location = user_profile.city or "Mumbai"

            # 3. Fetch all quotations for this EXACT combination (Part, Size, Group/Material)
            # Use the property-derived formatted name to match what was sent in RFQ
            q_part_name = bom_item.formatted_part
            quotes = Quotation.objects.filter(
                project_id=p_id,
                material_name__iexact=bom_item.material,
                part_name__iexact=q_part_name,
                size_spec__iexact=bom_item.size,
                price__isnull=False
            ).exclude(price=0)
            
            if not quotes.exists():
                return Response({"message": f"No submitted quotations found for {bom_item.material}. Ask vendors to submit their quotations first."}, status=status.HTTP_404_NOT_FOUND)

            # 4. Prepare data for the ranking service
            from Calbuy_procurement.geocoding import calculate_distance_km
            
            # Get latest organization location for dynamic distance calculation
            user_profile = None
            if request.user.is_authenticated:
                user_profile = UserProfile.objects.filter(user=request.user).first()
            
            org_lat = user_profile.latitude if user_profile else None
            org_lon = user_profile.longitude if user_profile else None

            quotation_data_list = []
            seen_vendors = set()
            for q in quotes:
                if q.vendor_id in seen_vendors:
                    continue
                seen_vendors.add(q.vendor_id)
                
                vendor = VendorDetails.objects.filter(vendor_id=q.vendor_id, is_active=True).first()
                if not vendor:
                    continue
                
                # Dynamic distance calculation based on CURRENT organization location
                dynamic_dist = q.distance_to_organization_km
                if org_lat and org_lon and q.latitude and q.longitude:
                    try:
                        # Re-calculate to account for any location changes of organization
                        dynamic_dist = calculate_distance_km(q.latitude, q.longitude, org_lat, org_lon)
                        # Optionally update the cached value
                        if dynamic_dist is not None:
                            q.distance_to_organization_km = dynamic_dist
                            q.save(update_fields=['distance_to_organization_km'])
                    except Exception:
                        pass

                # Normalize lead time (extract number if range)
                try:
                    lt = int(''.join(filter(str.isdigit, str(q.lead_time_days))))
                except:
                    lt = 15 # Default
                
                quotation_data_list.append({
                    'lead_time_days': lt,
                    'unit_price': float(q.price) if q.price else 0,
                    'total_price': float(q.price) * float(bom_item.quantity) if q.price and bom_item.quantity else 0,
                    'negotiation_percentage': float(q.negotiation_percentage) if q.negotiation_percentage else 0,
                    'distance_to_organization_km': float(dynamic_dist) if dynamic_dist else 0,
                    'vendor_name': vendor.vendor_name if vendor else q.vendor_id,
                    'quotation_id': q.id
                })

            # 5. Get Custom Weights if provided
            weights = None
            pw = request.query_params.get('price_weight')
            lw = request.query_params.get('lead_time_weight')
            dw = request.query_params.get('distance_weight')
            
            if pw is not None or lw is not None or dw is not None:
                try:
                    p_val = float(pw) if pw is not None else 40.0
                    l_val = float(lw) if lw is not None else 30.0
                    d_val = float(dw) if dw is not None else 30.0
                    
                    total = p_val + l_val + d_val
                    if total > 0:
                        weights = {
                            'price': p_val / total,
                            'lead_time': l_val / total,
                            'distance': d_val / total
                        }
                    else:
                        weights = {'price': 0.4, 'lead_time': 0.3, 'distance': 0.3}
                except ValueError:
                    pass # Fallback to default in service

            # 6. Call Ranking Service
            service = VendorRankingService()
            rankings = service.rank_vendors(quotation_data_list, float(bom_item.quantity), weights=weights)

            return Response(rankings, status=status.HTTP_200_OK)

        except BOM.DoesNotExist:
            return Response({"error": "BOM item not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class TrainModelView(APIView):
    authentication_classes = (CsrfExemptSessionAuthentication, BasicAuthentication)
    """
    Endpoint to trigger model training manually.
    """
    def post(self, request):
        try:
            from .ml import train_model, dataset_gen
            import os
            
            # 1. Generate fresh data if needed
            base_dir = os.path.dirname(os.path.abspath(__file__))
            data_path = os.path.join(base_dir, 'ml', 'data', 'vendor_quotes_v2.csv')
            dataset_gen.generate_synthetic_dataset(data_path)
            
            # 2. Train
            train_model.train()
            
            return Response({"message": "Model trained successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class ConfirmVendorView(APIView):
    authentication_classes = (CsrfExemptSessionAuthentication, BasicAuthentication)
    """
    Endpoint to finalize the selection of a vendor for a BOM item.
    """
    def post(self, request):
        bom_item_id = request.data.get('bom_item_id')
        quotation_id = request.data.get('quotation_id')
        
        if not bom_item_id or not quotation_id:
            return Response({"error": "bom_item_id and quotation_id are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            bom_item = get_object_or_404(BOM, id=bom_item_id)
            quotation = get_object_or_404(Quotation, id=quotation_id)
            
            # Update the BOM item with the selected quotation
            bom_item.selected_quotation = quotation
            bom_item.save()
            
            # Real-time Broadcast: Update UI
            broadcast_company_event(
                company_id=bom_item.company_id,
                action_type="vendor_confirmed",
                payload={"project_id": bom_item.project_id if bom_item.project else None, "bom_item_id": bom_item.id},
                sender_id=request.user.id if request.user.is_authenticated else None
            )
            
            return Response({
                "message": f"Successfully confirmed {quotation.vendor_id} for {bom_item.material}",
                "bom_item_id": bom_item.id,
                "quotation_id": quotation.id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
