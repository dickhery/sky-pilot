import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";

module {
  public type Clock = Map.Map<Principal, Int>;

  /// Minimum gap between authenticated writes from the same principal.
  public let minIntervalNs : Int = 5_000_000_000;

  public func empty() : Clock {
    Map.empty();
  };

  /// Reject anonymous callers and rapid repeat writes before any state change.
  public func allow(clock : Clock, caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("sign in with Internet Identity");
    };
    let now = Time.now();
    switch (clock.get(caller)) {
      case (?prev) {
        if (now - prev < minIntervalNs) {
          Runtime.trap("too many writes, try again shortly");
        };
      };
      case null {};
    };
    clock.add(caller, now);
  };
};
