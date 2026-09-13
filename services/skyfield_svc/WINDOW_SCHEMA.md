# Orbit Pass Window Schema

The `/passes` endpoint returns pass windows for a satellite.

## Request

GET `/passes?norad_id=XXXX&days=7`

## Response

```json
{
  "norad_id": "22490",
  "days": 7,
  "passes": [
    {
      "aos": "2026-09-04T09:30:51Z",
      "los": "2026-09-04T09:41:31Z",
      "max_el": 61.35,
      "az_aos": 295.26,
      "az_los": 96.31,
      "duration_s": 640.0,
      "ul_from": "2026-09-04T09:31:42Z",
      "ul_to": "2026-09-04T09:40:38Z",
      "ul_duration_s": 536.0,
      "ul_insufficient": false
    }
  ]
}
