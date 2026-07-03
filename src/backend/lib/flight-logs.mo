import List "mo:core/List";
import Principal "mo:core/Principal";
import Types "../types/flight-logs";

module {
  public type FlightLog = Types.FlightLog;
  public type FlightLogView = Types.FlightLogView;
  public type LogId = Types.LogId;
  public type PlayerId = Types.PlayerId;
  public type ScoreBreakdown = Types.ScoreBreakdown;

  /// List all flight logs belonging to the given player, newest first.
  public func listForPlayer(
    logs : List.List<FlightLog>,
    playerId : PlayerId,
  ) : [FlightLogView] {
    let owned = logs.filter(func(log) { Principal.equal(log.playerId, playerId) });
    // Logs are appended in chronological order; reverse for newest-first.
    owned.reverse().toArray()
  };

  /// Get a single flight log by id, scoped to the given player.
  public func getForPlayer(
    logs : List.List<FlightLog>,
    playerId : PlayerId,
    logId : LogId,
  ) : ?FlightLogView {
    logs.find(func(log) { log.id == logId and Principal.equal(log.playerId, playerId) })
  };

  /// Append a completed flight's score breakdown as a new log entry.
  /// Returns the created log entry.
  public func addLog(
    logs : List.List<FlightLog>,
    nextId : { var value : Nat },
    playerId : PlayerId,
    completedAt : Int,
    planName : Text,
    plane : Types.Plane,
    weather : Types.Weather,
    score : ScoreBreakdown,
  ) : FlightLogView {
    let id = nextId.value;
    nextId.value := id + 1;
    let entry : FlightLog = {
      id;
      playerId;
      completedAt;
      planName;
      plane;
      weather;
      score;
    };
    logs.add(entry);
    entry
  };
};
