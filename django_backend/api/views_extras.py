from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Sum
from django.utils import timezone
from .models import User, Redemption, Expense, TransferRequest
from .serializers import RedemptionSerializer, ExpenseSerializer, TransferRequestSerializer

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def handle_redemptions(request):
    user = request.user
    if request.method == 'GET':
        if user.role == 'admin':
            redemptions = Redemption.objects.filter(user__barangay=user.barangay).order_by('-timestamp')
        else:
            redemptions = Redemption.objects.filter(user=user).order_by('-timestamp')
        return Response(RedemptionSerializer(redemptions, many=True).data, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        data = request.data
        item_name = data.get('item_name')
        points_spent = data.get('points_spent')

        if not item_name or points_spent is None:
            return Response({"message": "Missing item name or points"}, status=status.HTTP_400_BAD_REQUEST)

        if user.points < int(points_spent):
            return Response({"message": "Insufficient points"}, status=status.HTTP_400_BAD_REQUEST)

        user.points -= int(points_spent)
        user.save()

        redemption = Redemption.objects.create(
            user=user,
            item_name=item_name,
            points_spent=int(points_spent)
        )
        return Response(RedemptionSerializer(redemption).data, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_redemption(request, redemption_id):
    user = request.user
    if user.role not in ['admin', 'official']:
        return Response({"message": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
    
    redemption = get_object_or_404(Redemption, id=redemption_id)
    if redemption.user.barangay != user.barangay:
        return Response({"message": "Unauthorized: Different barangay"}, status=status.HTTP_403_FORBIDDEN)

    redemption.status = 'Claimed'
    redemption.save()
    return Response(RedemptionSerializer(redemption).data, status=status.HTTP_200_OK)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def handle_expenses(request):
    user = request.user
    if user.role not in ['admin', 'official', 'barangay_official']:
        return Response({"message": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        expenses = Expense.objects.filter(barangay=user.barangay).order_by('-date')
        return Response(ExpenseSerializer(expenses, many=True).data, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        data = request.data
        expense_date = data.get('date') or timezone.now().strftime('%Y-%m-%d')
        
        expense = Expense.objects.create(
            barangay=user.barangay,
            amount=float(data.get('amount', 0)),
            description=data.get('description', 'No Description'),
            category=data.get('category', 'Spent'),
            date=expense_date
        )
        return Response(ExpenseSerializer(expense).data, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_expense_summary(request):
    user = request.user
    if user.role not in ['admin', 'official', 'barangay_official']:
        return Response({"message": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

    total_budget = Expense.objects.filter(barangay=user.barangay, category='Budget').aggregate(Sum('amount'))['amount__sum'] or 0
    total_spent = Expense.objects.filter(barangay=user.barangay, category='Spent').aggregate(Sum('amount'))['amount__sum'] or 0
    
    return Response({
        "total_budget": total_budget,
        "total_spent": total_spent,
        "remaining": total_budget - total_spent
    }, status=status.HTTP_200_OK)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def handle_transfer_requests(request):
    user = request.user
    if request.method == 'GET':
        requests = TransferRequest.objects.filter(user=user).order_by('-created_at')
        return Response(TransferRequestSerializer(requests, many=True).data, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        data = request.data
        source = user.barangay
        target = data.get('target_barangay')
        reason = data.get('reason')

        if not target:
            return Response({"message": "Target barangay required"}, status=status.HTTP_400_BAD_REQUEST)

        transfer = TransferRequest.objects.create(
            user=user,
            source_barangay=source,
            target_barangay=target,
            reason=reason
        )
        return Response(TransferRequestSerializer(transfer).data, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_incoming_transfers(request):
    user = request.user
    if user.role != 'admin':
        return Response({"message": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
    requests = TransferRequest.objects.filter(target_barangay=user.barangay).order_by('-created_at')
    return Response(TransferRequestSerializer(requests, many=True).data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def handle_transfer_decision(request):
    user = request.user
    if user.role != 'admin':
        return Response({"message": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

    data = request.data
    request_id = data.get('request_id')
    decision = data.get('decision') # Approved or Rejected

    transfer = get_object_or_404(TransferRequest, id=request_id)
    
    if transfer.target_barangay != user.barangay:
         return Response({"message": "Unauthorized: Not the target barangay admin"}, status=status.HTTP_403_FORBIDDEN)

    if decision == 'Approved':
        target_user = transfer.user
        target_user.barangay = transfer.target_barangay
        target_user.save()
    
    transfer.status = decision
    transfer.save()
    return Response(TransferRequestSerializer(transfer).data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def direct_transfer(request, user_id):
    admin = request.user
    if admin.role != 'admin':
        return Response({"message": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
    target_user = get_object_or_404(User, id=user_id)
    new_barangay = request.data.get('new_barangay')
    
    if not new_barangay:
        return Response({"message": "New barangay required"}, status=status.HTTP_400_BAD_REQUEST)
        
    target_user.barangay = new_barangay
    target_user.save()
    
    return Response({"message": "User transferred successfully"}, status=status.HTTP_200_OK)
