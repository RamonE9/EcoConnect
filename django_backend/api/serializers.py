from rest_framework import serializers
from .models import User, Event, Participation, OTPStore, Redemption, Expense, TransferRequest

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'phone_number', 'email', 'role', 'points', 'barangay', 'id_image', 'profile_picture', 'is_verified']

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'location', 'date', 'time', 'organizer', 'points_reward', 'barangay', 'status']

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
        fields = ['id', 'user', 'username', 'item_name', 'points_spent', 'timestamp', 'status']

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

class TransferRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = TransferRequest
        fields = ['id', 'user', 'username', 'source_barangay', 'target_barangay', 'reason', 'status', 'created_at']
