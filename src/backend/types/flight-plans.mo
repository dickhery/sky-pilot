module {
  /// Identifier for a flight plan.
  public type PlanId = Nat;

  /// The three supported weather conditions. Each affects in-flight
  /// sky/lighting visuals on the frontend.
  public type Weather = {
    #daytime;
    #nighttime;
    #partlyCloudy;
  };

  /// Identifier for one of the two selectable planes.
  public type PlaneId = Nat;

  /// A selectable plane with a distinct name and handling profile.
  public type Plane = {
    id : PlaneId;
    name : Text;
    /// Short description of handling characteristics (e.g. "fast and agile").
    handling : Text;
  };

  /// A runway identified by a name (e.g. "09L") and a short description.
  public type Runway = {
    name : Text;
    description : Text;
  };

  /// A guided waypoint the player flies toward between takeoff and landing.
  public type Waypoint = {
    name : Text;
    description : Text;
  };

  /// A complete flight plan: departure runway, guided destination waypoint,
  /// and landing runway, plus the plane and weather it is flown under.
  public type FlightPlan = {
    id : PlanId;
    name : Text;
    weather : Weather;
    plane : Plane;
    departure : Runway;
    waypoint : Waypoint;
    landing : Runway;
    /// Short human-readable route description shown on the selection card.
    routeDescription : Text;
  };
};
