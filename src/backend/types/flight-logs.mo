module {
  /// Identifier for a flight log entry.
  public type LogId = Nat;

  /// Identifier of the player who owns the log entry.
  public type PlayerId = Principal;

  /// The two selectable planes, each with distinct handling characteristics.
  public type Plane = {
    #cessna;
    #gulfstream;
  };

  /// The three weather conditions available for a flight plan.
  public type Weather = {
    #daytime;
    #nighttime;
    #partlyCloudy;
  };

  /// Per-component score breakdown for a completed flight.
  public type ScoreBreakdown = {
    /// Speed score based on time taken to complete the flight.
    speed : Nat;
    /// Landing smoothness score based on runway alignment and descent rate at touchdown.
    landingSmoothness : Nat;
    /// Combined total score presented on the post-flight results screen.
    total : Nat;
  };

  /// A persisted flight log entry. Shown as a clickable card in the Flight Logs list.
  public type FlightLog = {
    id : LogId;
    playerId : PlayerId;
    /// When the flight was completed (nanoseconds since epoch).
    completedAt : Int;
    /// Name of the flight plan that was flown.
    planName : Text;
    plane : Plane;
    weather : Weather;
    score : ScoreBreakdown;
  };

  /// Public API view of a flight log (shared/serializable).
  public type FlightLogView = FlightLog;
};
