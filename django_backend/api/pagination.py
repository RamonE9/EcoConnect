"""Pagination for list endpoints.

Clients that send `?page=N` get a page object:
    {"count": 120, "page": 2, "page_size": 50, "total_pages": 3, "results": [...]}

Clients that don't send `page` (the current dashboards) still get a plain list,
but it is capped at API_MAX_PAGE_SIZE rows and the real total is reported in
the `X-Total-Count` header. Either way a single request can no longer pull the
whole table.
"""
import math
from django.conf import settings
from rest_framework.response import Response


def paginated_response(request, queryset, serializer_class, **serializer_kwargs):
    max_size = getattr(settings, 'API_MAX_PAGE_SIZE', 200)
    default_size = getattr(settings, 'API_PAGE_SIZE', 50)
    total = queryset.count()

    if 'page' not in request.query_params:
        rows = serializer_class(queryset[:max_size], many=True, **serializer_kwargs).data
        response = Response(rows)
        response['X-Total-Count'] = str(total)
        return response

    try:
        page_size = min(max(int(request.query_params.get('page_size', default_size)), 1), max_size)
        page = max(int(request.query_params.get('page', 1)), 1)
    except ValueError:
        page_size, page = default_size, 1

    start = (page - 1) * page_size
    rows = serializer_class(queryset[start:start + page_size], many=True, **serializer_kwargs).data
    return Response({
        'count': total,
        'page': page,
        'page_size': page_size,
        'total_pages': math.ceil(total / page_size) if total else 0,
        'results': rows,
    })
