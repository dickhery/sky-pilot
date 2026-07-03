import Types "../types/flight-plans";

module {
  public type FlightPlan = Types.FlightPlan;
  public type PlanId = Types.PlanId;
  public type Plane = Types.Plane;
  public type Weather = Types.Weather;

  /// The first selectable plane (static record literal so it can be reused
  /// in the plans array without array indexing, which is non-static).
  public let cessna : Plane = {
    id = 1;
    name = "Cessna Skyhawk";
    handling = "Stable and forgiving — easy to control, ideal for new pilots.";
  };

  /// The second selectable plane.
  public let gulfstream : Plane = {
    id = 2;
    name = "Gulfstream G700";
    handling = "Fast and sporty — quick and responsive, rewards skilled flying.";
  };

  /// The two selectable planes with distinct handling characteristics.
  public let planes : [Plane] = [cessna, gulfstream];

  /// The three supported weather conditions.
  public let weather : [Weather] = [
    #daytime,
    #nighttime,
    #partlyCloudy,
  ];

  /// The full catalog of selectable flight plans covering all weather
  /// conditions and both planes.
  public let plans : [FlightPlan] = [
    {
      id = 1;
      name = "Morning Coastal Hop";
      weather = #daytime;
      plane = cessna;
      departure = { name = "09L"; description = "Sea-level runway with calm morning winds." };
      waypoint = { name = "Lighthouse Point"; description = "Follow the coastline to the lighthouse beacon." };
      landing = { name = "27R"; description = "Inland runway, gentle approach over the marsh." };
      routeDescription = "A relaxed daytime coastal flight in the Cessna — perfect for first-timers.";
    },
    {
      id = 2;
      name = "Midday Crosswind Run";
      weather = #daytime;
      plane = gulfstream;
      departure = { name = "12"; description = "Short mountain runway with shifting crosswinds." };
      waypoint = { name = "Ridge Pass"; description = "Climb over the ridge and hold heading through the gap." };
      landing = { name = "30"; description = "Long plateau runway, watch for gusts on final." };
      routeDescription = "A fast daytime mountain crossing in the Gulfstream — test your speed and precision.";
    },
    {
      id = 3;
      name = "Midnight Harbor Approach";
      weather = #nighttime;
      plane = cessna;
      departure = { name = "04R"; description = "Quiet night runway lit by runway edge lights." };
      waypoint = { name = "Harbor Beacon"; description = "Navigate by harbor lights to the lit beacon marker." };
      landing = { name = "22L"; description = "Glide slope lights guide you onto the harbor runway." };
      routeDescription = "A serene nighttime harbor flight in the Cessna — fly by the city lights.";
    },
    {
      id = 4;
      name = "Night Express";
      weather = #nighttime;
      plane = gulfstream;
      departure = { name = "16"; description = "Downtown night runway, skyline glow on takeoff." };
      waypoint = { name = "City Tower"; description = "Bank toward the illuminated tower and circle it." };
      landing = { name = "34"; description = "Approach between skyscrapers onto the city runway." };
      routeDescription = "A high-speed nighttime city circuit in the Gulfstream — threading the skyline.";
    },
    {
      id = 5;
      name = "Cloudy Valley Tour";
      weather = #partlyCloudy;
      plane = cessna;
      departure = { name = "07L"; description = "Valley floor runway under a partly cloudy sky." };
      waypoint = { name = "Cloud Gap"; description = "Climb through the cloud gap to the valley overlook." };
      landing = { name = "25R"; description = "Descend below the clouds onto the far valley runway." };
      routeDescription = "A scenic cloudy valley flight in the Cessna — watch the shifting cloud cover.";
    },
    {
      id = 6;
      name = "Storm Front Sprint";
      weather = #partlyCloudy;
      plane = gulfstream;
      departure = { name = "13"; description = "Coastal runway with building cloud cover offshore." };
      waypoint = { name = "Weather Buoy"; description = "Push out over the water to the weather buoy marker." };
      landing = { name = "31"; description = "Beat the clouds back to the coastal runway." };
      routeDescription = "A brisk cloudy coastal sprint in the Gulfstream — race the incoming weather.";
    },
  ];

  /// List all available flight plans (the level-select grid).
  public func listPlans() : [FlightPlan] {
    plans;
  };

  /// Look up a single flight plan by id.
  public func getPlan(planId : PlanId) : ?FlightPlan {
    plans.find(func(p) { p.id == planId });
  };

  /// Return the two selectable planes with distinct handling.
  public func listPlanes() : [Plane] {
    planes;
  };

  /// Return the three supported weather conditions.
  public func listWeather() : [Weather] {
    weather;
  };
};
