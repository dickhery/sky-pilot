import FlightLogs "flight-logs";

module {
  public type EntryId = Nat;
  public type Plane = FlightLogs.Plane;
  public type Weather = FlightLogs.Weather;

  /// One published high-score row on the public board.
  public type LeaderboardEntry = {
    id : EntryId;
    playerId : Principal;
    displayName : Text;
    planName : Text;
    plane : Plane;
    weather : Weather;
    total : Nat;
    submittedAt : Int;
  };

  public type LeaderboardEntryView = LeaderboardEntry;

  public type SubmitOutcome = {
    #posted : LeaderboardEntryView;
    #improved : LeaderboardEntryView;
    #unchanged : LeaderboardEntryView;
    #tooLow : { needed : Nat };
  };
};
