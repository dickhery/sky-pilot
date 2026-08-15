import FlightPlans "flight-plans";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Types "../types/leaderboard";

module {
  public type LeaderboardEntry = Types.LeaderboardEntry;
  public type LeaderboardEntryView = Types.LeaderboardEntryView;
  public type SubmitOutcome = Types.SubmitOutcome;

  /// Hard cap per catalog map so the canister cannot grow without bound.
  /// Six plans × 10 = 60 rows max.
  public let maxEntriesPerPlan : Nat = 10;
  public let maxNameChars : Nat = 20;

  /// Public query payload — top `maxEntriesPerPlan` per known flight plan,
  /// highest total first within each map. One query, no extra update cost.
  public func listTop(entries : List.List<LeaderboardEntry>) : [LeaderboardEntryView] {
    var out : [LeaderboardEntryView] = [];
    for (plan in FlightPlans.plans.values()) {
      out := out.concat(topForPlan(entries, plan.name));
    };
    out;
  };

  /// Authenticated submit. One row per principal per map; only a better
  /// total replaces that map's existing row. Each map is capped independently.
  public func submit(
    entries : List.List<LeaderboardEntry>,
    nextId : { var value : Nat },
    caller : Principal,
    displayName : Text,
    planName : Text,
    plane : Types.Plane,
    weather : Types.Weather,
    total : Nat,
  ) : SubmitOutcome {
    if (caller.isAnonymous()) {
      Runtime.trap("sign in with Internet Identity to post a score");
    };
    if (total > 100) {
      Runtime.trap("score must be 0-100");
    };
    if (not isKnownPlan(planName)) {
      Runtime.trap("unknown flight plan");
    };
    let name = sanitizeName(displayName);

    switch (
      entries.find(
        func(e : LeaderboardEntry) : Bool {
          Principal.equal(e.playerId, caller) and e.planName == planName
        }
      )
    ) {
      case (?existing) {
        if (total <= existing.total) {
          return #unchanged(existing);
        };
        let updated : LeaderboardEntry = {
          id = existing.id;
          playerId = caller;
          displayName = name;
          planName;
          plane;
          weather;
          total;
          submittedAt = Time.now();
        };
        replacePlayerOnPlan(entries, updated);
        #improved(updated);
      };
      case null {
        let onPlan = entries.filter(
          func(e : LeaderboardEntry) : Bool { e.planName == planName }
        );
        if (onPlan.size() >= maxEntriesPerPlan) {
          let lowest = onPlan.min(compareByTotalAsc);
          switch (lowest) {
            case (?low) {
              if (total <= low.total) {
                return #tooLow({ needed = low.total + 1 });
              };
              dropEntry(entries, low.id);
            };
            case null {};
          };
        };
        let id = nextId.value;
        nextId.value := id + 1;
        let posted : LeaderboardEntry = {
          id;
          playerId = caller;
          displayName = name;
          planName;
          plane;
          weather;
          total;
          submittedAt = Time.now();
        };
        entries.add(posted);
        #posted(posted);
      };
    };
  };

  func isKnownPlan(name : Text) : Bool {
    FlightPlans.plans.find(func(p : FlightPlans.FlightPlan) : Bool { p.name == name }) != null;
  };

  func topForPlan(entries : List.List<LeaderboardEntry>, planName : Text) : [LeaderboardEntryView] {
    let sorted = entries.toArray().filter(
      func(e : LeaderboardEntry) : Bool { e.planName == planName }
    ).sort(compareByTotalDesc);
    if (sorted.size() <= maxEntriesPerPlan) {
      sorted;
    } else {
      sorted.sliceToArray(0, maxEntriesPerPlan);
    };
  };

  func compareByTotalDesc(a : LeaderboardEntry, b : LeaderboardEntry) : {
    #less;
    #equal;
    #greater;
  } {
    Nat.compare(b.total, a.total);
  };

  func compareByTotalAsc(a : LeaderboardEntry, b : LeaderboardEntry) : {
    #less;
    #equal;
    #greater;
  } {
    Nat.compare(a.total, b.total);
  };

  func sanitizeName(raw : Text) : Text {
    let name = raw.trim(#text " ");
    if (name.isEmpty()) {
      Runtime.trap("display name is required");
    };
    if (name.size() > maxNameChars) {
      Runtime.trap("display name must be 20 characters or fewer");
    };
    name;
  };

  func replacePlayerOnPlan(entries : List.List<LeaderboardEntry>, next : LeaderboardEntry) {
    let snapshot = entries.toArray();
    entries.clear();
    for (entry in snapshot.values()) {
      if (Principal.equal(entry.playerId, next.playerId) and entry.planName == next.planName) {
        entries.add(next);
      } else {
        entries.add(entry);
      };
    };
  };

  func dropEntry(entries : List.List<LeaderboardEntry>, id : Nat) {
    let snapshot = entries.toArray();
    entries.clear();
    for (entry in snapshot.values()) {
      if (entry.id != id) {
        entries.add(entry);
      };
    };
  };
};
