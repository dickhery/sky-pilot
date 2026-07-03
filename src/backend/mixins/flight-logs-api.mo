import List "mo:core/List";
import Principal "mo:core/Principal";
import Types "../types/flight-logs";
import FlightLogs "../lib/flight-logs";

mixin (
  logs : List.List<Types.FlightLog>,
  nextLogId : { var value : Nat },
) {
  /// List the caller's past flights, newest first.
  /// Each entry shows date, flight plan name, plane, and score breakdown.
  public shared query ({ caller }) func listFlightLogs() : async [Types.FlightLogView] {
    FlightLogs.listForPlayer(logs, caller)
  };

  /// Get a single flight log by id, scoped to the caller.
  /// Powers the detail view with the full score breakdown.
  public shared query ({ caller }) func getFlightLog(logId : Types.LogId) : async ?Types.FlightLogView {
    FlightLogs.getForPlayer(logs, caller, logId)
  };

  /// Persist a completed flight's score breakdown to the caller's flight log.
  /// Called by the post-flight results screen on completion.
  public shared ({ caller }) func recordFlightLog(
    completedAt : Int,
    planName : Text,
    plane : Types.Plane,
    weather : Types.Weather,
    score : Types.ScoreBreakdown,
  ) : async Types.FlightLogView {
    FlightLogs.addLog(logs, nextLogId, caller, completedAt, planName, plane, weather, score)
  };
};
