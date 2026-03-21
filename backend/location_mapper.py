"""Maps free-text location strings from fishing reports to canonical fishing zones on Delavan Lake."""

from dataclasses import dataclass


@dataclass
class FishingZone:
    """A canonical fishing zone on Delavan Lake."""
    zone_id: str
    name: str
    description: str
    svg_path_id: str
    typical_depth_min: float
    typical_depth_max: float
    # SVG viewport coordinates (0-1000 x 0-500 viewBox)
    center_x: float
    center_y: float


# Canonical fishing zones based on bathymetric map
FISHING_ZONES: list[FishingZone] = [
    FishingZone(
        zone_id="north-shore",
        name="North Shore",
        description="Northern shoreline along N. Shore Dr, shallow weed flats and access points",
        svg_path_id="zone-north-shore",
        typical_depth_min=2, typical_depth_max=15,
        center_x=400, center_y=120,
    ),
    FishingZone(
        zone_id="south-shore",
        name="South Shore",
        description="Southern shoreline along South Sunshine Dr, gradual drop-offs",
        svg_path_id="zone-south-shore",
        typical_depth_min=2, typical_depth_max=15,
        center_x=500, center_y=400,
    ),
    FishingZone(
        zone_id="east-end",
        name="East End",
        description="Eastern basin near Lake Lawn, deepest area of the lake (40-50ft)",
        svg_path_id="zone-east-end",
        typical_depth_min=25, typical_depth_max=50,
        center_x=800, center_y=200,
    ),
    FishingZone(
        zone_id="west-end",
        name="West End",
        description="Western shallow bay near The Island and Brown's Channel, excellent panfish habitat",
        svg_path_id="zone-west-end",
        typical_depth_min=2, typical_depth_max=20,
        center_x=150, center_y=350,
    ),
    FishingZone(
        zone_id="the-island",
        name="The Island",
        description="Small island in the southwest, surrounded by weed beds and emergent vegetation",
        svg_path_id="zone-the-island",
        typical_depth_min=3, typical_depth_max=15,
        center_x=180, center_y=400,
    ),
    FishingZone(
        zone_id="browns-channel",
        name="Brown's Channel",
        description="Channel on the south side near Cord O, connecting waterway with current",
        svg_path_id="zone-browns-channel",
        typical_depth_min=2, typical_depth_max=10,
        center_x=120, center_y=470,
    ),
    FishingZone(
        zone_id="lake-lawn",
        name="Lake Lawn",
        description="Northeast area near Lake Lawn resort, steep drop-offs and deep structure",
        svg_path_id="zone-lake-lawn",
        typical_depth_min=5, typical_depth_max=35,
        center_x=880, center_y=100,
    ),
    FishingZone(
        zone_id="jackson-creek",
        name="Jackson Creek",
        description="Creek inlet on the far east end, current attracts baitfish and predators",
        svg_path_id="zone-jackson-creek",
        typical_depth_min=2, typical_depth_max=10,
        center_x=960, center_y=80,
    ),
    FishingZone(
        zone_id="main-basin",
        name="Main Basin",
        description="Central deep water area of the lake, 35-50ft depths, open water trolling",
        svg_path_id="zone-main-basin",
        typical_depth_min=30, typical_depth_max=50,
        center_x=550, center_y=280,
    ),
    FishingZone(
        zone_id="weed-beds",
        name="Weed Beds",
        description="Scattered weed beds along shorelines, prime panfish and bass habitat",
        svg_path_id="zone-weed-beds",
        typical_depth_min=3, typical_depth_max=12,
        center_x=300, center_y=300,
    ),
    FishingZone(
        zone_id="drop-offs",
        name="Drop-offs",
        description="Depth transition zones where shallow flats break into deeper water",
        svg_path_id="zone-drop-offs",
        typical_depth_min=10, typical_depth_max=25,
        center_x=450, center_y=250,
    ),
    FishingZone(
        zone_id="inlet",
        name="Inlet",
        description="Western inlet area where water flows into the lake",
        svg_path_id="zone-inlet",
        typical_depth_min=2, typical_depth_max=8,
        center_x=50, center_y=280,
    ),
    FishingZone(
        zone_id="south-end",
        name="South End",
        description="Southern portion of the lake, mixed depths with weed structure",
        svg_path_id="zone-south-end",
        typical_depth_min=5, typical_depth_max=25,
        center_x=350, center_y=420,
    ),
    FishingZone(
        zone_id="deep-water",
        name="Deep Water",
        description="Deepest portions of the lake, 40-50ft, summer thermocline fishing",
        svg_path_id="zone-deep-water",
        typical_depth_min=40, typical_depth_max=50,
        center_x=650, center_y=250,
    ),
    FishingZone(
        zone_id="shallow-flats",
        name="Shallow Flats",
        description="Shallow areas under 10ft, spring spawning grounds",
        svg_path_id="zone-shallow-flats",
        typical_depth_min=1, typical_depth_max=10,
        center_x=200, center_y=300,
    ),
]

# Zone lookup by ID
ZONE_MAP: dict[str, FishingZone] = {z.zone_id: z for z in FISHING_ZONES}

# Keyword patterns mapped to zone IDs (checked in order, first match wins)
# Each entry: (keywords_to_match, zone_id)
LOCATION_KEYWORDS: list[tuple[list[str], str]] = [
    # Specific landmarks first
    (["island", "the island"], "the-island"),
    (["brown", "browns", "brown's", "channel"], "browns-channel"),
    (["lake lawn", "lawn", "resort"], "lake-lawn"),
    (["jackson", "creek", "jackson creek"], "jackson-creek"),
    (["inlet", "inflow"], "inlet"),

    # Directional areas
    (["north shore", "n shore", "north side", "northshore"], "north-shore"),
    (["south shore", "south side", "southshore", "south sunshine"], "south-shore"),
    (["south end", "southern end", "south"], "south-end"),
    (["east end", "eastern end", "east side", "east"], "east-end"),
    (["west end", "western end", "west side", "west"], "west-end"),

    # Structure types
    (["weed", "weeds", "weed bed", "weed line", "vegetation", "cabbage", "lily", "pad"], "weed-beds"),
    (["drop off", "drop-off", "dropoff", "break", "breakline", "ledge", "edge"], "drop-offs"),
    (["deep water", "deep", "basin", "main lake", "open water", "middle"], "main-basin"),
    (["shallow", "flat", "flats", "shore", "shoreline"], "shallow-flats"),
    (["deep hole", "deepest", "50 feet", "50ft"], "deep-water"),
]


def map_location_to_zone(location: str | None) -> str | None:
    """Map a free-text location string to a canonical zone ID.

    Returns the zone_id if matched, or None if no match found.
    """
    if not location:
        return None

    location_lower = location.lower().strip()

    # Check each keyword pattern
    for keywords, zone_id in LOCATION_KEYWORDS:
        for keyword in keywords:
            if keyword in location_lower:
                return zone_id

    # Check if location exactly matches a zone name (case-insensitive)
    for zone in FISHING_ZONES:
        if zone.name.lower() == location_lower:
            return zone.zone_id

    return None


def get_zone(zone_id: str) -> FishingZone | None:
    """Get a fishing zone by ID."""
    return ZONE_MAP.get(zone_id)


def get_all_zones() -> list[dict]:
    """Get all fishing zones as dictionaries."""
    return [
        {
            "zone_id": z.zone_id,
            "name": z.name,
            "description": z.description,
            "svg_path_id": z.svg_path_id,
            "typical_depth_min": z.typical_depth_min,
            "typical_depth_max": z.typical_depth_max,
            "center_x": z.center_x,
            "center_y": z.center_y,
        }
        for z in FISHING_ZONES
    ]
