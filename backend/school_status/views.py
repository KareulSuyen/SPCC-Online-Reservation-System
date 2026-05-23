from django.http import JsonResponse
from django.conf import settings
from datetime import datetime
import requests
import pytz


def get_school_status(request):
    lat = request.GET.get('lat', '14.6508281')
    lon = request.GET.get('lon', '120.9888715')
    api_key = settings.WEATHER_API

    ph_tz = pytz.timezone('Asia/Manila')
    now = datetime.now(ph_tz)

    day = now.weekday()
    hours = now.hour
    minutes = now.minute
    current_time = hours + minutes / 60.0

    school_open_time = 8.0   
    school_close_time = 16.75 

    bc_open_time = 7.5   
    bc_close_time = 16.0      

    is_weekend = day >= 5
    school_open = not is_weekend and school_open_time <= current_time < school_close_time
    bc_open = not is_weekend and bc_open_time <= current_time < bc_close_time

    weather_data = None
    weather = None

    if is_weekend:
        status = 'closed'
        message = 'The Business Center and School are closed on weekends'
    elif current_time < bc_open_time:
        status = 'closed'
        total_minutes_until_open = int((bc_open_time - current_time) * 60)
        hours_until_open = total_minutes_until_open // 60
        minutes_until_open = total_minutes_until_open % 60
        message = f'The Business Center opens at 7:30 AM (in {hours_until_open}h {minutes_until_open}m)'
    elif current_time >= school_close_time:
        status = 'closed'
        message = 'The Business Center is closed'
    elif current_time >= bc_close_time:
        status = 'closed'
        message = 'The Business Center is closed - (school is still open until 4:45 PM)'
    elif current_time >= bc_close_time - 0.5:
        status = 'warning'
        minutes_until_close = int((bc_close_time - current_time) * 60)
        message = f'The Business Center closes soon (in {minutes_until_close} minutes) — school remains open until 4:45 PM'
    else:
        status = 'open'
        message = 'The Business Center is open until 4:00 PM'

    try:
        url = f'https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric'
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        weather = response.json()

        weather_data = {
            'temperature': round(weather['main']['temp'], 1),
            'description': weather['weather'][0]['description'],
            'main': weather['weather'][0]['main'],
            'humidity': weather['main']['humidity'],
            'wind_speed': round(weather['wind']['speed'], 1),
            'icon': weather['weather'][0]['icon']
        }

    except requests.exceptions.RequestException as e:
        print(f"Weather API error: {e}")

    if status == 'open' and weather_data:
        weather_id = weather['weather'][0]['id']
        if weather_id < 300:
            status = 'warning'
            message = f'Weather warning: {weather_data["description"]}. Stay safe!'
        elif 500 <= weather_id < 600:
            if weather_id >= 502:
                status = 'warning'
                message = 'Heavy rain detected. Exercise caution!'
            else:
                message = 'Light rain. The Business Center is open until 4:00 PM'
        elif 600 <= weather_id < 700:
            status = 'warning'
            message = f'Unusual weather: {weather_data["description"]}'

    response_data = {
        'status': status,
        'message': message,
        'lastUpdated': now.isoformat(),
        'weather': weather_data,
        'schedule': {
            'businessCenter': {
                'openTime': '7:30 AM',
                'closeTime': '4:00 PM',
                'isOpen': bc_open,
            },
            'school': {
                'openTime': '8:00 AM',
                'closeTime': '4:45 PM',
                'isOpen': school_open,
            },
            'isWeekend': is_weekend,
        }
    }

    return JsonResponse(response_data)