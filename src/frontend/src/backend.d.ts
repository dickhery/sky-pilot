import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ScoreBreakdown {
    landingSmoothness: bigint;
    total: bigint;
    speed: bigint;
}
export interface Plane__1 {
    id: PlaneId;
    name: string;
    handling: string;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export type PlaneId = bigint;
export interface FlightLog {
    id: LogId;
    completedAt: bigint;
    playerId: PlayerId;
    score: ScoreBreakdown;
    plane: Plane;
    weather: Weather;
    planName: string;
}
export interface FlightPlan {
    id: PlanId;
    routeDescription: string;
    name: string;
    waypoint: Waypoint;
    plane: Plane__1;
    weather: Weather;
    departure: Runway;
    landing: Runway;
}
export interface Waypoint {
    name: string;
    description: string;
}
export type LogId = bigint;
export type PlayerId = Principal;
export type Result = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface FlightLogView {
    id: LogId;
    completedAt: bigint;
    playerId: PlayerId;
    score: ScoreBreakdown;
    plane: Plane;
    weather: Weather;
    planName: string;
}
export interface Runway {
    name: string;
    description: string;
}
export type PlanId = bigint;
export enum Plane {
    cessna = "cessna",
    gulfstream = "gulfstream"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Weather {
    nighttime = "nighttime",
    partlyCloudy = "partlyCloudy",
    daytime = "daytime"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getCallerUserRole(): Promise<UserRole>;
    getFlightLog(logId: LogId): Promise<FlightLogView | null>;
    getFlightPlan(planId: PlanId): Promise<FlightPlan | null>;
    isCallerAdmin(): Promise<boolean>;
    listFlightLogs(): Promise<Array<FlightLogView>>;
    listFlightPlans(): Promise<Array<FlightPlan>>;
    listPlanes(): Promise<Array<Plane__1>>;
    listWeather(): Promise<Array<Weather>>;
    recordFlightLog(completedAt: bigint, planName: string, plane: Plane, weather: Weather, score: ScoreBreakdown): Promise<FlightLogView>;
}
