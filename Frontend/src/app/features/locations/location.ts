export type CityId = string;

export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export interface City extends Coordinates {
  readonly id: CityId;
  readonly name: string;
  readonly country: string;
  readonly timezone: string;
}

export interface NearbyCity {
  readonly city: City;
  readonly distanceKm: number;
}
