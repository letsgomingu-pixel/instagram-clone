CARRIERS: dict[str, str] = {
    "cj": "CJ대한통운",
    "hanjin": "한진택배",
    "lotte": "롯데택배",
    "epost": "우체국택배",
    "logen": "로젠택배",
    "kdexp": "경동택배",
    "daesin": "대신택배",
}


def carrier_label(code: str | None) -> str | None:
    if not code:
        return None
    return CARRIERS.get(code)


def tracking_phrase(carrier: str | None, tracking_number: str | None) -> str:
    if not tracking_number:
        return ""
    label = carrier_label(carrier)
    if label:
        return f" {label} 운송장번호 {tracking_number}"
    return f" 운송장번호 {tracking_number}"
