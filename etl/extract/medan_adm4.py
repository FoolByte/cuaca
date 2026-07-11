"""ADM4 codes for all kelurahan in Kota Medan.

Each ADM4 code follows the format: 12.71.{KdKec}.{KdKel}
where 12 = Sumatera Utara, 71 = Kota Medan.

Source: BMKG administrative boundary codes.
"""

# ── Kecamatan → Kelurahan mapping ────────────────────────────────────
# Key   = kecamatan code (2-digit, e.g. "01")
# Value = list of kelurahan codes (4-digit, e.g. "1001")

KECAMATAN: dict[str, dict[str, list[str]]] = {
    "01": {
        "name": "Medan Kota",
        "kelurahan": [
            "1001", "1002", "1003", "1004", "1005", "1006",
            "1007", "1008", "1009", "1010", "1011", "1012",
        ],
    },
    "02": {
        "name": "Medan Sunggal",
        "kelurahan": ["1001", "1002", "1003", "1004", "1005", "1006"],
    },
    "03": {
        "name": "Medan Helvetia",
        "kelurahan": [
            "1001", "1002", "1003", "1004", "1005", "1006", "1007",
        ],
    },
    "04": {
        "name": "Medan Denai",
        "kelurahan": ["1001", "1002", "1003", "1004", "1005", "1006"],
    },
    "05": {
        "name": "Medan Barat",
        "kelurahan": ["1001", "1002", "1003", "1004", "1005", "1006"],
    },
    "06": {
        "name": "Medan Deli",
        "kelurahan": ["1001", "1002", "1003", "1004", "1005", "1006"],
    },
    "07": {
        "name": "Medan Tuntungan",
        "kelurahan": [
            "1001", "1002", "1003", "1004", "1005", "1006",
            "1007", "1008", "1009",
        ],
    },
    "08": {
        "name": "Medan Belawan",
        "kelurahan": ["1001", "1002", "1003", "1004", "1005", "1006"],
    },
    "09": {
        "name": "Medan Amplas",
        "kelurahan": [
            "1001", "1002", "1003", "1004", "1005", "1006", "1007",
        ],
    },
    "10": {
        "name": "Medan Area",
        "kelurahan": [
            "1001", "1002", "1003", "1004", "1005", "1006",
            "1007", "1008", "1009", "1010", "1011", "1012",
        ],
    },
    "11": {
        "name": "Medan Johor",
        "kelurahan": ["1001", "1002", "1003", "1004", "1005", "1006"],
    },
    "12": {
        "name": "Medan Marelan",
        "kelurahan": ["1001", "1002", "1003", "1004", "1005"],
    },
    "13": {
        "name": "Medan Labuhan",
        "kelurahan": ["1001", "1002", "1003", "1004", "1005", "1006"],
    },
    "14": {
        "name": "Medan Tembung",
        "kelurahan": [
            "1001", "1002", "1003", "1004", "1005", "1006", "1007",
        ],
    },
    "15": {
        "name": "Medan Maimun",
        "kelurahan": ["1001", "1002", "1003", "1004", "1005", "1006"],
    },
    "16": {
        "name": "Medan Polonia",
        "kelurahan": ["1001", "1002", "1003", "1004", "1005"],
    },
    "17": {
        "name": "Medan Baru",
        "kelurahan": ["1001", "1002", "1003", "1004", "1005", "1006"],
    },
    "18": {
        "name": "Medan Perjuangan",
        "kelurahan": [
            "1001", "1002", "1003", "1004", "1005", "1006",
            "1007", "1008", "1009",
        ],
    },
    "19": {
        "name": "Medan Petisah",
        "kelurahan": [
            "1001", "1002", "1003", "1004", "1005", "1006", "1007",
        ],
    },
    "20": {
        "name": "Medan Timur",
        "kelurahan": [
            "1001", "1002", "1003", "1004", "1005", "1006",
            "1007", "1008", "1009", "1010", "1011",
        ],
    },
    "21": {
        "name": "Medan Selayang",
        "kelurahan": ["1001", "1002", "1003", "1004", "1005", "1006"],
    },
}


def all_kelurahan_adm4() -> list[str]:
    """Return all ADM4 codes for Medan kelurahan.

    Format: "12.71.{kec}.{kel}" e.g. "12.71.01.1001"
    """
    codes: list[str] = []
    for kec_code, kec_data in KECAMATAN.items():
        for kel_code in kec_data["kelurahan"]:
            codes.append(f"12.71.{kec_code}.{kel_code}")
    return codes


def kecamatan_adm3() -> list[str]:
    """Return ADM3 codes for all kecamatan in Medan.

    Format: "12.71.{kec}" e.g. "12.71.01"
    """
    return [f"12.71.{kec_code}" for kec_code in KECAMATAN]
