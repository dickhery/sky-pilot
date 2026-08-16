import FlightPlans "flight-plans";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Types "../types/flight-logs";

module {
  public type FlightLog = Types.FlightLog;
  public type FlightLogView = Types.FlightLogView;
  public type LogId = Types.LogId;
  public type PlayerId = Types.PlayerId;
  public type ScoreBreakdown = Types.ScoreBreakdown;

  /// Hard caps so user-controlled writes cannot grow canister memory without bound.
  public let maxLogsPerPlayer : Nat = 20;
  public let maxLogsTotal : Nat = 400;

  /// List all flight logs belonging to the given player, newest first.
  public func listForPlayer(
    logs : List.List<FlightLog>,
    playerId : PlayerId,
  ) : [FlightLogView] {
    let owned = List.empty<FlightLogView>();
    for (log in logs.reverseValues()) {
      if (Principal.equal(log.playerId, playerId)) {
        owned.add(log);
      };
    };
    owned.toArray();
  };

  /// Get a single flight log by id, scoped to the given player.
  public func getForPlayer(
    logs : List.List<FlightLog>,
    playerId : PlayerId,
    logId : LogId,
  ) : ?FlightLogView {
    logs.find(func(log) { log.id == logId and Principal.equal(log.playerId, playerId) });
  };

  /// Append a completed flight's score breakdown as a new log entry.
  /// Evicts the caller's oldest row (then the global oldest) when a cap is hit.
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
    if (playerId.isAnonymous()) {
      Runtime.trap("sign in with Internet Identity to save a flight");
    };
    if (not isKnownPlan(planName)) {
      Runtime.trap("unknown flight plan");
    };
    if (not validScore(score)) {
      Runtime.trap("score must be 0-100");
    };

    var owned : Nat = 0;
    for (log in logs.values()) {
      if (Principal.equal(log.playerId, playerId)) {
        owned += 1;
      };
    };
    if (owned >= maxLogsPerPlayer) {
      dropFirst(logs, func(log : FlightLog) : Bool { Principal.equal(log.playerId, playerId) });
    };
    if (logs.size() >= maxLogsTotal) {
      dropFirst(logs, func(_log : FlightLog) : Bool { true });
    };

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
    entry;
  };

  func isKnownPlan(name : Text) : Bool {
    FlightPlans.plans.find(func(p : FlightPlans.FlightPlan) : Bool { p.name == name }) != null;
  };

  func validScore(score : ScoreBreakdown) : Bool {
    score.speed <= 100 and score.landingSmoothness <= 100 and score.total <= 100;
  };

  func dropFirst(logs : List.List<FlightLog>, pred : FlightLog -> Bool) {
    var dropped = false;
    let snapshot = logs.toArray();
    logs.clear();
    for (log in snapshot.values()) {
      if (not dropped and pred(log)) {
        dropped := true;
      } else {
        logs.add(log);
      };
    };
  };
};
