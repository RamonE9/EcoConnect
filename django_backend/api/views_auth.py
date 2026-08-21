import os
import random
import pandas as pd
import io
from datetime import timedelta
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.files.storage import FileSystemStorage
from django.http import HttpResponse
from django.db import models
from django.shortcuts import get_object_or_404, render
from .models import User, OTPStore
from .serializers import UserSerializer

def index(request, path=''):
    return render(request, 'index.html')

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    data = request.data
    username = data.get('username')
    phone_number = data.get('phone_number')
    password = data.get('password')
    email = data.get('email')
    role = data.get('role', 'resident')
    barangay = data.get('barangay')

    if not email:
        return Response({"message": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({"message": "Email already registered"}, status=status.HTTP_400_BAD_REQUEST)
        
    if User.objects.filter(username=username).exists():
        return Response({"message": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)
        
    if User.objects.filter(phone_number=phone_number).exists():
        return Response({"message": "Phone number already registered"}, status=status.HTTP_400_BAD_REQUEST)

    id_image_path = None
    if 'id_image' in request.FILES:
        file = request.FILES['id_image']
        fs = FileSystemStorage(location=os.path.join(settings.BASE_DIR, 'static/uploads'))
        filename = fs.save(f"{username}_{file.name}", file)
        id_image_path = f"static/uploads/{filename}"

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        phone_number=phone_number,
        role=role,
        barangay=barangay,
        id_image=id_image_path,
        is_verified=(role in ['admin', 'official'])
    )

    return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    data = request.data
    username = data.get('username')
    password = data.get('password')
    barangay = data.get('barangay')

    user = User.objects.filter(username=username).first()

    if user and user.check_password(password):
        refresh = RefreshToken.for_user(user)
        return Response({
            "message": "Login successful",
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)

    return Response({"message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

def send_email_otp(target_email, otp):
    try:
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
                    <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0;">EcoConnect</h1>
                    </div>
                    <div style="padding: 20px;">
                        <h2>Hello!</h2>
                        <p>You requested a verification code for your EcoConnect account.</p>
                        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #10b981;">{otp}</span>
                        </div>
                        <p>This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #666; text-align: center;">&copy; 2026 EcoConnect Project - Sustainable Barangay Management</p>
                    </div>
                </div>
            </body>
        </html>
        """
        send_mail(
            "EcoConnect: Your Verification Code",
            "",
            settings.EMAIL_HOST_USER,
            [target_email],
            fail_silently=False,
            html_message=body
        )
        return True, "Email Dispatched"
    except Exception as e:
        return False, str(e)

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    data = request.data
    phone_number = data.get('phone_number') or data.get('id')
    
    user = User.objects.filter(phone_number=phone_number).first()
    if not user:
        return Response({"message": "Account with this phone number not found"}, status=status.HTTP_404_NOT_FOUND)
        
    if not user.email:
         return Response({"message": "No recovery email linked to this account. Contact admin."}, status=status.HTTP_400_BAD_REQUEST)
        
    otp = str(random.randint(100000, 999999))
    
    OTPStore.objects.filter(phone_number=user.phone_number, is_used=False).update(is_used=True)
    OTPStore.objects.filter(email=user.email, is_used=False).update(is_used=True)
    
    OTPStore.objects.create(email=user.email, phone_number=user.phone_number, otp_code=otp)
    
    email_sent, status_msg = send_email_otp(user.email, otp)
    
    if email_sent:
        return Response({"message": f"Verification code sent to {user.email}"}, status=status.HTTP_200_OK)
    else:
        return Response({
            "message": f"Server connection pending settings. For testing, please check the backend terminal.",
            "error_detail": status_msg,
            "is_simulation": True
        }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    data = request.data
    identifier = data.get('phone_number') or data.get('id')
    otp_code = data.get('otp_code')
    new_password = data.get('new_password')
    
    otp_entry = OTPStore.objects.filter(
        models.Q(phone_number=identifier) | models.Q(email=identifier),
        otp_code=otp_code,
        is_used=False
    ).first()
    
    if not otp_entry:
        return Response({"message": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)
        
    user = User.objects.filter(phone_number=identifier).first()
    if user:
        user.set_password(new_password)
        user.save()
        otp_entry.is_used = True
        otp_entry.save()
        return Response({"message": "Password reset successfully"}, status=status.HTTP_200_OK)
        
    return Response({"message": "User not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_users(request):
    admin = request.user
    if not admin:
        return Response({"message": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
    users = User.objects.filter(barangay=admin.barangay)
    return Response(UserSerializer(users, many=True).data, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_residents(request):
    admin = request.user
    if not admin or admin.role not in ['admin', 'official']:
        return Response({"message": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
    users = User.objects.filter(barangay=admin.barangay, role='resident')
    
    data = []
    for u in users:
        data.append({
            "Username": u.username,
            "Email": u.email,
            "Phone Number": u.phone_number,
            "Role": u.role,
            "Points": u.points,
            "Barangay": u.barangay,
            "Verified": "Yes" if u.is_verified else "No"
        })
    
    df = pd.DataFrame(data)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Registered Residents')
    
    output.seek(0)
    response = HttpResponse(
        output.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename=Residents_{admin.barangay}_{timezone.now().strftime("%Y%m%d")}.xlsx'
    return response

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_user(request, user_id):
    admin = request.user
    target_user = get_object_or_404(User, id=user_id)
    
    if admin.role == 'admin' and target_user.barangay != admin.barangay:
        return Response({"message": "Unauthorized: User belongs to a different barangay"}, status=status.HTTP_403_FORBIDDEN)
        
    target_user.is_verified = not target_user.is_verified
    target_user.save()
    return Response({"message": f"User {'verified' if target_user.is_verified else 'unverified'}", "is_verified": target_user.is_verified}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_barangay_officials(request):
    barangay = request.query_params.get('barangay')
    if not barangay:
        if request.user.is_authenticated:
            barangay = request.user.barangay
        else:
            return Response({"message": "Barangay required"}, status=status.HTTP_400_BAD_REQUEST)
            
    officials = User.objects.filter(barangay=barangay, role__in=['official', 'admin'])
    return Response(UserSerializer(officials, many=True).data, status=status.HTTP_200_OK)

@api_view(['PUT', 'POST'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user
    data = request.data
    
    user.username = data.get('username', user.username)
    user.email = data.get('email', user.email)
    user.phone_number = data.get('phone_number', user.phone_number)
    
    if 'profile_picture' in request.FILES:
        file = request.FILES['profile_picture']
        fs = FileSystemStorage(location=os.path.join(settings.BASE_DIR, 'static/uploads'))
        filename = fs.save(f"profile_{user.username}_{file.name}", file)
        user.profile_picture = f"static/uploads/{filename}"

    password = data.get('password')
    if password:
        user.set_password(password)
        
    user.save()
    return Response({"message": "Profile updated", "user": UserSerializer(user).data}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    query = request.query_params.get('query', '')
    if len(query) < 2:
        return Response([], status=status.HTTP_200_OK)
        
    users = User.objects.filter(
        models.Q(username__icontains=query) | models.Q(phone_number__icontains=query),
        role='resident'
    ).exclude(barangay=request.user.barangay)
    
    return Response(UserSerializer(users, many=True).data, status=status.HTTP_200_OK)
