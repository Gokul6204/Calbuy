from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from project.models import Project, Quotation
from bom.models import BOM
from vendor.models import VendorDetails
from accounts.models import UserProfile
from .ranking_service import VendorRankingService

class VendorRankingView(APIView):
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
                    org_location = user_profile.organization_location

            # 3. Fetch all quotations for this item (only those that are submitted/have data)
            from django.db.models import Q
            quotes = Quotation.objects.filter(
                Q(bom_item_id=b_id) | Q(material_name__iexact=bom_item.material),
                project_id=p_id,
                price__isnull=False,
                count__isnull=False
            ).exclude(price=0)
            
            if not quotes.exists():
                return Response({"message": f"No submitted quotations found for {bom_item.material}. Ask vendors to submit their prices first."}, status=status.HTTP_404_NOT_FOUND)

            # 4. Prepare data for the ranking service
            quotation_data_list = []
            seen_vendors = set()
            for q in quotes:
                if q.vendor_id in seen_vendors:
                    continue
                seen_vendors.add(q.vendor_id)
                
                vendor = VendorDetails.objects.filter(vendor_id=q.vendor_id, is_active=True).first()
                if not vendor:
                    continue
                
                # Normalize lead time (extract number if range)
                try:
                    lt = int(''.join(filter(str.isdigit, str(q.lead_time_days))))
                except:
                    lt = 15 # Default
                
                quotation_data_list.append({
                    'organization_location': org_location,
                    'part_number': bom_item.part_number,
                    'material_name': q.material_name,
                    'shipment_from_location': vendor.location if vendor else "Domestic",
                    'lead_time_days': lt,
                    'supplying_quantity': float(q.count) if q.count else 0,
                    'unit_price': float(q.price) if q.price else 0,
                    'total_price': float(q.price) * float(bom_item.quantity) if q.price else 0,
                    'vendor_name': vendor.vendor_name if vendor else q.vendor_id,
                    'quotation_id': q.id
                })

            # 5. Get Custom Weights if provided
            weights = None
            pw = request.query_params.get('price_weight')
            lw = request.query_params.get('lead_time_weight')
            qw = request.query_params.get('quantity_weight')
            
            if pw is not None or lw is not None or qw is not None:
                try:
                    p_val = float(pw) if pw is not None else 60.0
                    l_val = float(lw) if lw is not None else 20.0
                    q_val = float(qw) if qw is not None else 20.0
                    
                    total = p_val + l_val + q_val
                    if total > 0:
                        weights = {
                            'price': p_val / total,
                            'lead_time': l_val / total,
                            'quantity': q_val / total
                        }
                    else:
                        weights = {'price': 0.34, 'lead_time': 0.33, 'quantity': 0.33}
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

class TrainModelView(APIView):
    """
    Endpoint to trigger model training manually.
    """
    def post(self, request):
        try:
            from .ml import train_model, dataset_gen
            import os
            
            # 1. Generate fresh data if needed
            base_dir = os.path.dirname(os.path.abspath(__file__))
            data_path = os.path.join(base_dir, 'ml', 'data', 'vendor_quotes.csv')
            dataset_gen.generate_synthetic_dataset(data_path)
            
            # 2. Train
            train_model.train()
            
            return Response({"message": "Model trained successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ConfirmVendorView(APIView):
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
            
            return Response({
                "message": f"Successfully confirmed {quotation.vendor_id} for {bom_item.material}",
                "bom_item_id": bom_item.id,
                "quotation_id": quotation.id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
