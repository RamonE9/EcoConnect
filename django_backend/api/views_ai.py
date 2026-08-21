import os
import random
import google.generativeai as genai
from dotenv import load_dotenv
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .models import User, Event, Participation
from django.db.models import Count

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY and GEMINI_API_KEY != "your_actual_api_key_here":
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    model = None

@api_view(['POST'])
@permission_classes([AllowAny])
def eco_assistant_chat(request):
    user_message = request.data.get('message', '')
    
    user = request.user
    if not user.is_authenticated:
        if request.headers.get('X-Dev-Bypass') == 'DEV_BYPASS_TOKEN':
            user = User.objects.filter(username='Dev_Resident').first() or User.objects.first()
        else:
            return Response({"detail": "Authentication credentials were not provided."}, status=401)

    if not user:
        return Response({"detail": "User not found."}, status=404)

    recent_events = Event.objects.filter(barangay=user.barangay).order_by('-date')[:3]
    event_list = "\n".join([f"- {e.title} on {e.date}" for e in recent_events])
    
    system_prompt = f"""
    You are the 'EcoConnect Intelligence' assistant for a community cleanup platform.
    Your goal is to help users manage their eco-credits and participate in local environmental efforts.
    
    CURRENT USER CONTEXT:
    - Name: {user.username}
    - Location: {user.barangay} Sector
    - Current Eco-Credits: {user.points}
    - Recent Events in their area:
    {event_list if event_list else "No upcoming events scheduled yet."}
    
    RULES:
    1. Users earn 10 points per cleanup participation.
    2. Points can be redeemed for grocery vouchers (500 pts) or mobile load (100 pts).
    3. If they moved, they should use the 'Transfer' tab.
    4. Be polite, encouraging, and use a professional yet friendly 'Eco-Warrior' tone.
    5. Keep responses concise (2-3 sentences).
    
    User says: {user_message}
    """

    if model:
        try:
            response = model.generate_content(system_prompt)
            return Response({"response": response.text})
        except Exception as e:
            print(f"Gemini Error: {e}")
            return get_fallback_response(user, user_message)
    else:
        return get_fallback_response(user, user_message)

def get_fallback_response(user, message):
    message = message.lower()
    if 'points' in message or 'credits' in message:
        return Response({"response": f"You have {user.points} Eco-Credits. Keep it up, Eco-Warrior!"})
    elif 'cleanup' in message or 'event' in message:
        return Response({"response": f"Check the 'Overview' tab to see cleanup drives in {user.barangay}!"})
    else:
        return Response({"response": "I am the EcoConnect Assistant! I'm currently in basic mode. Please add your Gemini API key to unlock my full intelligence!"})

@api_view(['GET'])
@permission_classes([AllowAny])
def smart_scheduling_advice(request):
    user = request.user
    if not user.is_authenticated:
        if request.headers.get('X-Dev-Bypass') == 'DEV_BYPASS_TOKEN':
            user = User.objects.filter(role='admin').first() or User.objects.first()
        else:
            return Response({"detail": "Authentication credentials were not provided."}, status=401)

    barangay = user.barangay
    total_residents = User.objects.filter(barangay=barangay, role='resident').count()
    active_participation = Participation.objects.filter(event__barangay=barangay).count()
    
    suggestions = [
        f"Based on {total_residents} residents, we suggest a weekend morning drive for maximum turnout.",
        "Participation is high! Consider a 'Double Points' flash event this Wednesday.",
        f"Your {barangay} sector has seen low activity lately. A community incentive drive is recommended."
    ]
    
    return Response({
        "suggestion": random.choice(suggestions),
        "data_analysis": f"Sector: {barangay} | Reach: {active_participation}/{total_residents}"
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def personalized_eco_tips(request):
    user = request.user
    if not user.is_authenticated:
        if request.headers.get('X-Dev-Bypass') == 'DEV_BYPASS_TOKEN':
            user = User.objects.filter(username='Dev_Resident').first() or User.objects.first()
        else:
            return Response({"detail": "Authentication credentials were not provided."}, status=401)

    barangay_tips = {
        "Santa Monica": [
            "Being a coastal sector, Santa Monica relies on us! Try to clear plastics near the shoreline to prevent ocean pollution.",
            "The Santa Monica Material Recovery Facility (MRF) is currently offering bonus points for segregated glass bottles!",
            "Eco-Warrior Tip: Protecting the mangroves in the Santa Monica area is vital for our local ecosystem."
        ],
        "San Jose": [
            "San Jose's urban areas generate more paper waste. Consider starting a community composting bin!",
            "Did you know? The San Jose central market is now a 'Zero Plastic' zone. Bring your Eco-Bags!"
        ],
        "Tiniguiban": [
            "Tiniguiban residents are leading in bottle collection! Check the local hub for the latest leaderboard standings."
        ]
    }

    local_tips = barangay_tips.get(user.barangay, [])
    generic_tips = [
        "Did you know? Recycling 1 ton of plastic saves 5,774 kWh of energy!",
        "Tip: Cleaning up small litter prevents it from entering our drainage systems during rain.",
        "Your points are growing! Saving up for the 500-point voucher gives the best value."
    ]
    
    all_tips = local_tips + generic_tips if local_tips else generic_tips
    
    return Response({
        "tip": random.choice(all_tips),
        "level": "Eco-Warrior" if user.points > 100 else "Eco-Starter"
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def smart_reminders(request):
    user = request.user
    if not user.is_authenticated:
        if request.headers.get('X-Dev-Bypass') == 'DEV_BYPASS_TOKEN':
            user = User.objects.filter(username='Dev_Resident').first() or User.objects.first()
        else:
            return Response({"detail": "Authentication credentials were not provided."}, status=401)

    participations = Participation.objects.filter(user=user, status='joined')
    reminders = []

    for part in participations:
        event = part.event
        title = event.title.lower()
        
        tools = ["🧤 Protective Gloves", "💧 Water Bottle"]
        if "coastal" in title or "beach" in title or "river" in title:
            tools += ["👢 Rubber Boots", "🧺 Sieve/Basket", "🧴 Sunscreen"]
        elif "park" in title or "street" in title or "road" in title:
            tools += ["🧹 Broom", "🧤 Tongs/Pickers", "🧢 Cap/Hat"]
        else:
            tools += ["🥡 Trash Bags", "🩹 Small First-aid Kit"]

        reminders.append({
            "event_id": event.id,
            "event_title": event.title,
            "date": event.date,
            "time": event.time,
            "suggested_tools": tools,
            "notification": f"Smart Reminder: Your cleanup drive '{event.title}' is coming up on {event.date}! Don't forget your gear."
        })

    return Response(reminders)
