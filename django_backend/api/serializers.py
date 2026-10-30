from rest_framework import serializers
from .models import compute_title, User, Event, Participation, OTPStore, Redemption, Expense, TransferRequest, Incentive, PointAward

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'phone_number', 'email', 'role', 'points', 'barangay', 'has_id_image', 'profile_picture', 'is_verified', 'title']

    title = serializers.SerializerMethodField()
    # The ID photo's location is never sent; it is fetched through a short-lived link.
    has_id_image = serializers.SerializerMethodField()

    def get_has_id_image(self, obj):
        return bool(obj.id_image)

    def get_title(self, obj):
        # Always derived from current points, so it can never go stale.
        return compute_title(obj.points)


class PublicUserSerializer(serializers.ModelSerializer):
    """Leaderboard view: no phone, email or government ID."""
    class Meta:
        model = User
        fields = ['id', 'username', 'points', 'barangay', 'profile_picture', 'title']

    title = serializers.SerializerMethodField()

    def get_title(self, obj):
        return compute_title(obj.points)


class OfficialContactSerializer(serializers.ModelSerializer):
    """Contact card for barangay officials shown to residents."""
    class Meta:
        model = User
        fields = ['id', 'username', 'phone_number', 'email', 'role', 'barangay', 'profile_picture']

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'location', 'date', 'time', 'organizer', 'points_reward', 'barangay', 'status', 'category']

class ParticipationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participation
        fields = ['id', 'user', 'event', 'status', 'verified_at']

class OTPStoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTPStore
        fields = '__all__'

class RedemptionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = Redemption
        fields = ['id', 'user', 'username', 'item_name', 'quantity', 'points_spent', 'timestamp', 'status']

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

class TransferRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = TransferRequest
        fields = ['id', 'user', 'username', 'source_barangay', 'target_barangay', 'reason', 'status', 'created_at']

class IncentiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incentive
        fields = ['id', 'barangay', 'name', 'points_cost', 'stock', 'max_per_claim', 'icon', 'is_active']

class PointAwardSerializer(serializers.ModelSerializer):
    awarded_by_username = serializers.CharField(source='awarded_by.username', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = PointAward
        fields = ['id', 'user', 'username', 'awarded_by', 'awarded_by_username', 'points', 'reason', 'created_at']
