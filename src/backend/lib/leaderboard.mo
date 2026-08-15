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

  /// Hard cap so the canister cannot grow without bound.
  public let maxEntries : Nat = 25;
  public let maxNameChars : Nat = 20;

  /// Public query payload — at most `maxEntries`, highest total first.
  public func listTop(entries : List.List<LeaderboardEntry>) : [LeaderboardEntryView] {
    let sorted = entries.toArray().sort(compareByTotalDesc);
    if (sorted.size() <= maxEntries) {
      sorted;
    } else {
      sorted.sliceToArray(0, maxEntries);
    };
  };

  /// Authenticated submit. One row per principal; only a better total replaces
  /// an existing row. The board never exceeds `maxEntries`.
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
    let name = sanitizeName(displayName);

    switch (
      entries.find(func(e : LeaderboardEntry) : Bool { Principal.equal(e.playerId, caller) })
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
        replacePlayer(entries, updated);
        #improved(updated);
      };
      case null {
        if (entries.size() >= maxEntries) {
          let lowest = entries.min(compareByTotalAsc);
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

  func replacePlayer(entries : List.List<LeaderboardEntry>, next : LeaderboardEntry) {
    let snapshot = entries.toArray();
    entries.clear();
    for (entry in snapshot.values()) {
      if (Principal.equal(entry.playerId, next.playerId)) {
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
