import { Client, LatLngLiteral, PlaceData } from "@googlemaps/google-maps-services-js";

const client = new Client({});

interface IFilterResult {
    name?: string;
    address?: string;
    location?: LatLngLiteral;
}

export default class FindEstablishments {
    async findRestaurant(latitude: number, longitude: number): Promise<Partial<PlaceData>[] | undefined> {
        try {
            if (!process.env.GOOGLE_API_KEY) throw new Error("Google_api_key not defined.");

            const location: LatLngLiteral = { lat: latitude, lng: longitude };

            const response = await client.placesNearby({
                params: {
                    location: location,
                    radius: 5000,
                    type: "restaurant",
                    key: process.env.GOOGLE_API_KEY,
                },
                timeout: 5000,
            });

            return response.data.results;
        } catch (err) {
            console.log(err);
            return;
        }
    }

    filterResult(results: Partial<PlaceData>[], filter: string): IFilterResult {
        const filtered = results.map((result, index) => {
            if (!result.name) return;

            if (result.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())) {
                return result;
            } else {
                return;
            }
        });

        const item = filtered.filter((item) => item?.name?.toLocaleLowerCase().includes(filter.toLocaleLowerCase()));

        const location = item[0]?.geometry?.location;

        const response = {
            name: item[0]?.name,
            address: item[0]?.vicinity,
            location,
        };

        return response;
    }
}
