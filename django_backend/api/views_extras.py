from django.db import transaction
from django.db.models import F, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Expense, Incentive, Redemption, TransferRequest, User, compute_title
from .pagination import paginated_response
from .permissions import IsAdminForWrites, IsBarangayAdmin, is_admin
from .serializers import ExpenseSerializer, IncentiveSerializer, RedemptionSerializer, TransferRequestSerializer
from .validators import ValidationError, clean_amount, clean_int, clean_text

TRANSFER_DECISIONS = ('Approved', 'Rejected')


def bad_request(message):
    return Response({"message": message}, status=status.HTTP_400_BAD_REQUEST)


def forbidden(message="Unauthorized"):
    return Response({"message": message}, status=status.HTTP_403_FORBIDDEN)


# ─── Redemptions ──────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def handle_redemptions(request):
    user = request.user
    if request.method == 'GET':
        if is_admin(user):
            redemptions = Redemption.objects.filter(user__barangay=user.barangay)
        else:
            redemptions = Redemption.objects.filter(user=user)
        return paginated_response(request, redemptions.select_related('user').order_by('-timestamp'),
                                  RedemptionSerializer)

    incentive_id = request.data.get('incentive_id')
    if not incentive_id:
        return bad_request("Please choose a reward from your barangay's catalog")

    # Everything below runs in one transaction with row locks, so two residents
    # redeeming the last item at the same moment cannot both succeed, and one
    # resident double-clicking cannot spend the same points twice.
    with transaction.atomic():
        incentive = get_object_or_404(Incentive.objects.select_for_update(), id=incentive_id)
        member = User.objects.select_for_update().get(pk=user.pk)

        if not incentive.is_active or incentive.barangay != member.barangay:
            return bad_request("This reward is not available in your barangay")
        # The price comes from the database, never from the request body.
        cost = incentive.points_cost
        if member.points < cost:
            return bad_request("Insufficient points")

        # Conditional UPDATE: only succeeds while stock is still above zero.
        if Incentive.objects.filter(pk=incentive.pk, stock__gt=0).update(stock=F('stock') - 1) == 0:
            return bad_request("This item is out of stock")
        User.objects.filter(pk=member.pk).update(points=F('points') - cost)

        redemption = Redemption.objects.create(user=member, item_name=incentive.name, points_spent=cost)

    return Response(RedemptionSerializer(redemption).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsBarangayAdmin])
def approve_redemption(request, redemption_id):
    with transaction.atomic():
        redemption = get_object_or_404(Redemption.objects.select_for_update().select_related('user'),
                                       id=redemption_id)
        if redemption.user.barangay != request.user.barangay:
            return forbidden("Unauthorized: Different barangay")
        if redemption.status != 'Pending':
            return bad_request(f"This request is already {redemption.status.lower()}")
        redemption.status = 'Claimed'
        redemption.save(update_fields=['status'])
    return Response(RedemptionSerializer(redemption).data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsBarangayAdmin])
def reject_redemption(request, redemption_id):
    """Reject a pending claim: refund the points and put the item back in stock."""
    with transaction.atomic():
        redemption = get_object_or_404(Redemption.objects.select_for_update().select_related('user'),
                                       id=redemption_id)
        if redemption.user.barangay != request.user.barangay:
            return forbidden("Unauthorized: Different barangay")
        if redemption.status != 'Pending':
            return bad_request(f"This request is already {redemption.status.lower()}")

        User.objects.filter(pk=redemption.user_id).update(points=F('points') + redemption.points_spent)
        incentive = (Incentive.objects.select_for_update()
                     .filter(barangay=redemption.user.barangay, name=redemption.item_name)
                     .order_by('-is_active', 'id').first())
        if incentive:
            Incentive.objects.filter(pk=incentive.pk).update(stock=F('stock') + 1)

        member = User.objects.get(pk=redemption.user_id)
        member.title = compute_title(member.points)
        member.save(update_fields=['title'])
        redemption.status = 'Rejected'
        redemption.save(update_fields=['status'])
    return Response(RedemptionSerializer(redemption).data, status=status.HTTP_200_OK)


# ─── Expenses ─────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsBarangayAdmin])
def handle_expenses(request):
    user = request.user
    if request.method == 'GET':
        expenses = Expense.objects.filter(barangay=user.barangay).order_by('-date', '-id')
        return paginated_response(request, expenses, ExpenseSerializer)

    data = request.data
    try:
        amount = clean_amount(data.get('amount'))
        description = clean_text(data.get('description'), 'Description', 200)
    except ValidationError as exc:
        return bad_request(str(exc))
    category = data.get('category') if data.get('category') in ('Budget', 'Spent') else 'Spent'

    expense = Expense.objects.create(
        barangay=user.barangay,
        amount=amount,
        description=description,
        category=category,
        date=data.get('date') or timezone.now().strftime('%Y-%m-%d'),
    )
    return Response(ExpenseSerializer(expense).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsBarangayAdmin])
def get_expense_summary(request):
    expenses = Expense.objects.filter(barangay=request.user.barangay)
    total_budget = expenses.filter(category='Budget').aggregate(Sum('amount'))['amount__sum'] or 0
    total_spent = expenses.filter(category='Spent').aggregate(Sum('amount'))['amount__sum'] or 0
    return Response({"total_budget": total_budget, "total_spent": total_spent,
                     "remaining": total_budget - total_spent}, status=status.HTTP_200_OK)


# ─── Barangay transfers ───────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def handle_transfer_requests(request):
    user = request.user
    if request.method == 'GET':
        requests = TransferRequest.objects.filter(user=user).order_by('-created_at')
        return Response(TransferRequestSerializer(requests, many=True).data, status=status.HTTP_200_OK)

    try:
        target = clean_text(request.data.get('target_barangay'), 'Target barangay', 50)
        reason = clean_text(request.data.get('reason'), 'Reason', 500, required=False)
    except ValidationError as exc:
        return bad_request(str(exc))

    if target == user.barangay:
        return bad_request("You are already registered in that barangay")
    if TransferRequest.objects.filter(user=user, status='Pending').exists():
        return bad_request("You already have a pending transfer request")

    transfer = TransferRequest.objects.create(user=user, source_barangay=user.barangay,
                                              target_barangay=target, reason=reason)
    return Response(TransferRequestSerializer(transfer).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsBarangayAdmin])
def get_incoming_transfers(request):
    requests = TransferRequest.objects.filter(target_barangay=request.user.barangay).order_by('-created_at')
    return paginated_response(request, requests.select_related('user'), TransferRequestSerializer)


@api_view(['POST'])
@permission_classes([IsBarangayAdmin])
def handle_transfer_decision(request):
    decision = request.data.get('decision')
    if decision not in TRANSFER_DECISIONS:
        return bad_request("Decision must be Approved or Rejected")

    with transaction.atomic():
        transfer = get_object_or_404(TransferRequest.objects.select_for_update(), id=request.data.get('request_id'))
        if transfer.target_barangay != request.user.barangay:
            return forbidden("Unauthorized: Not the target barangay admin")
        if transfer.status != 'Pending':
            return bad_request(f"This request was already {transfer.status.lower()}")

        if decision == 'Approved':
            User.objects.filter(pk=transfer.user_id).update(barangay=transfer.target_barangay)
        transfer.status = decision
        transfer.save(update_fields=['status'])
    return Response(TransferRequestSerializer(transfer).data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsBarangayAdmin])
def direct_transfer(request, user_id):
    target_user = get_object_or_404(User, id=user_id, role='resident')
    try:
        new_barangay = clean_text(request.data.get('new_barangay'), 'New barangay', 50)
    except ValidationError as exc:
        return bad_request(str(exc))
    # An official may only move residents into or out of their own barangay.
    if request.user.barangay not in (target_user.barangay, new_barangay):
        return forbidden("You can only transfer residents into or out of your own barangay")

    target_user.barangay = new_barangay
    target_user.save(update_fields=['barangay'])
    return Response({"message": "User transferred successfully"}, status=status.HTTP_200_OK)


# ─── Incentive / stock management ─────────────────────────────────────────────

def clean_incentive_fields(data, incentive=None):
    def pick(key, default):
        return data.get(key) if key in data else (getattr(incentive, key) if incentive else default)

    return {
        'name': clean_text(pick('name', ''), 'Item name', 100),
        'points_cost': clean_int(pick('points_cost', 50), 'Points cost', min_value=1, max_value=100_000),
        'stock': clean_int(pick('stock', 0), 'Stock', min_value=0, max_value=100_000),
        'icon': clean_text(pick('icon', '🎁'), 'Icon', 10, required=False) or '🎁',
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAdminForWrites])
def handle_incentives(request):
    """GET: active incentives for the user's barangay. POST: officials create one."""
    user = request.user
    if request.method == 'GET':
        incentives = Incentive.objects.filter(barangay=user.barangay, is_active=True).order_by('points_cost')
        return Response(IncentiveSerializer(incentives, many=True).data, status=status.HTTP_200_OK)

    try:
        fields = clean_incentive_fields(request.data)
    except ValidationError as exc:
        return bad_request(str(exc))
    incentive = Incentive.objects.create(barangay=user.barangay, is_active=True, **fields)
    return Response(IncentiveSerializer(incentive).data, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsBarangayAdmin])
def incentive_detail(request, incentive_id):
    """PUT: update an item. DELETE: deactivate it (soft delete)."""
    incentive = get_object_or_404(Incentive, id=incentive_id)
    if incentive.barangay != request.user.barangay:
        return forbidden("Unauthorized: Incentive belongs to a different barangay")

    if request.method == 'PUT':
        try:
            fields = clean_incentive_fields(request.data, incentive)
        except ValidationError as exc:
            return bad_request(str(exc))
        for key, value in fields.items():
            setattr(incentive, key, value)
        if 'is_active' in request.data:
            incentive.is_active = str(request.data.get('is_active')).lower() in ('true', '1')
        incentive.save()
        return Response(IncentiveSerializer(incentive).data, status=status.HTTP_200_OK)

    incentive.is_active = False
    incentive.save(update_fields=['is_active'])
    return Response({"message": "Incentive removed"}, status=status.HTTP_200_OK)
