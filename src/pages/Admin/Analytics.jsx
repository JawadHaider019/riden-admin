import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { MiniChart, Loader, SearchBar } from '@/components/UI';
import { getDashboardStats, getDashboardAnalytics, getOnlineDrivers } from '../../api/dashboard';
import { getVehicleDetail, getVehicleTypes } from '../../api/vehicleApi';
import { useJsApiLoader, GoogleMap, MarkerF, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';
import { reverseGeocode } from '../../utils/geoUtils';
import { getImageUrl } from '../../api/api';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { format, startOfWeek, startOfMonth, startOfYear, parseISO, startOfDay, endOfDay } from 'date-fns';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

// Helper component for images with fallback to initials
const SafeImage = ({ src, alt, initials, className, fallbackClassName }) => {
    const [error, setError] = useState(false);

    useEffect(() => {
        setError(false);
    }, [src]);

    if (!src || error) {
        return (
            <div className={`${className} ${fallbackClassName} flex items-center justify-center text-white  text-2xl shadow-sm shrink-0`}>
                {initials}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={`${className} shrink-0`}
            onError={() => setError(true)}
        />
    );
};

export default function Analytics() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [globalPeriod, setGlobalPeriod] = useState('This Week');
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [selectedCarType, setSelectedCarType] = useState('All Vehicles');
    const [carTypes, setCarTypes] = useState([{ name: '', label: 'All Vehicles' }]);
    const [isSelectOpen, setIsSelectOpen] = useState(false);
    const [locationSearch, setLocationSearch] = useState('');
    const [searchCoords, setSearchCoords] = useState(null);
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [directions, setDirections] = useState(null);
    const [mapCenter, setMapCenter] = useState({ lat: 31.46982435, lng: 74.27143511 });
    const [onlineDrivers, setOnlineDrivers] = useState({ with_rides: [], without_rides: [] });
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [isSearchingBounds, setIsSearchingBounds] = useState(true); // Always show on open
    const [addresses, setAddresses] = useState({ pickup_address: 'Loading...', dropoff_address: 'Loading...', current: 'Loading...' });

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_KEY,
        libraries: ['places']
    });

    useEffect(() => {
        const fetchDetails = async () => {
            if (!selectedDriver) return;

            console.log('--- Debugging Selected Driver Location ---');
            console.log('Driver ID:', selectedDriver.id);
            console.log('Current Tracking:', selectedDriver.tracking);
            if (selectedDriver.bookings?.[0]) {
                const b = selectedDriver.bookings[0];
                console.log('Booking #:', b.id);
                console.log('Pickup Coords:', { lat: b.pickup_lat, lng: b.pickup_lng });
                console.log('Dropoff Coords:', { lat: b.dropoff_lat, lng: b.dropoff_lng });
            }

            setAddresses({ pickup_address: 'Loading...', dropoff_address: 'Loading...', current: 'Loading...' });

            const results = { current: 'N/A', pickup_address: 'N/A', dropoff_address: 'N/A' };

            // 1. Fetch Addresses
            if (selectedDriver.tracking) {
                reverseGeocode(selectedDriver.tracking.curr_lat, selectedDriver.tracking.curr_lon)
                    .then(addr => {
                        console.log('Geocoded Current Location:', addr);
                        setAddresses(prev => ({ ...prev, current: addr }));
                    });
            }

            if (selectedDriver.type === 'Busy' && selectedDriver.bookings?.[0]) {
                const booking = selectedDriver.bookings[0];
                setAddresses(prev => ({
                    ...prev,
                    pickup_address: booking.pickup_address || 'N/A',
                    dropoff_address: booking.dropoff_address || 'N/A'
                }));
            }

            // 2. Fetch Full Vehicle Details if available
            if (selectedDriver.vehicle?.id) {
                try {
                    const vRes = await getVehicleDetail(selectedDriver.vehicle.id);
                    const vData = vRes.data || vRes;
                    setSelectedDriver(prev => {
                        if (!prev || prev.id !== selectedDriver.id) return prev;
                        return { ...prev, vehicle: vData };
                    });
                } catch (e) {
                    console.error("Failed to fetch detailed vehicle info", e);
                }
            }
        };

        fetchDetails();
    }, [selectedDriver?.id]);

    // Fetch directions for Busy Drivers
    useEffect(() => {
        if (!isLoaded || !selectedDriver || selectedDriver.type !== 'Busy') {
            setDirections(null);
            return;
        }

        setDirections(null); // Clear previous directions immediately
        const booking = selectedDriver.bookings?.[0];
        if (!booking || !booking.pickup_lat || !booking.dropoff_lat) return;

        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(
            {
                origin: { lat: parseFloat(booking.pickup_lat), lng: parseFloat(booking.pickup_lng) },
                destination: { lat: parseFloat(booking.dropoff_lat), lng: parseFloat(booking.dropoff_lng) },
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK) {
                    setDirections(result);
                } else {
                    console.error(`error fetching directions ${result}`);
                }
            }
        );
    }, [selectedDriver, isLoaded]);

    // Distance calculation helper (Haversine formula)
    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Debounced Location Search & Geocoding
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!locationSearch || !isLoaded || locationSearch.length < 2) {
                setSearchCoords(null);
                setAddressSuggestions([]);
                return;
            }

            // Fetch Place Suggestions
            const service = new window.google.maps.places.AutocompleteService();
            service.getPlacePredictions({ input: locationSearch }, (predictions, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                    setAddressSuggestions(predictions);
                } else {
                    setAddressSuggestions([]);
                }
            });

            // Geocode for Map Navigation
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: locationSearch }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const loc = results[0].geometry.location;
                    const coords = { lat: loc.lat(), lng: loc.lng() };
                    setSearchCoords(coords);
                    setMapCenter(coords);
                    if (mapInstance) {
                        mapInstance.panTo(coords);
                        mapInstance.setZoom(12);
                    }
                } else {
                    setSearchCoords(null);
                }
            });
        }, 600); // reduced debounce for snappier feel

        return () => clearTimeout(timer);
    }, [locationSearch, isLoaded]);

    const handleSelectSuggestion = (suggestion) => {
        setLocationSearch(suggestion.description);
        setAddressSuggestions([]);
        setShowSuggestions(false);

        // Geocode the selected suggestion
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: suggestion.description }, (results, status) => {
            if (status === 'OK' && results[0] && mapInstance) {
                const loc = results[0].geometry.location;
                const coords = { lat: loc.lat(), lng: loc.lng() };
                setMapCenter(coords);
                setSearchCoords(coords);
                mapInstance.panTo(loc);
                mapInstance.setZoom(14);
            }
        });
    };

    const [mapInstance, setMapInstance] = useState(null);

    const onLoad = useCallback(function callback(map) {
        setMapInstance(map);
    }, []);

    useEffect(() => {
        if (!mapInstance || !selectedDriver) return;

        const bounds = new window.google.maps.LatLngBounds();

        // Add current driver location
        if (selectedDriver.tracking) {
            bounds.extend({
                lat: parseFloat(selectedDriver.tracking.curr_lat),
                lng: parseFloat(selectedDriver.tracking.curr_lon)
            });
        }

        // Add booking locations if busy
        if (selectedDriver.type === 'Busy' && selectedDriver.bookings?.[0]) {
            const b = selectedDriver.bookings[0];
            bounds.extend({ lat: parseFloat(b.pickup_lat), lng: parseFloat(b.pickup_lng) });
            bounds.extend({ lat: parseFloat(b.dropoff_lat), lng: parseFloat(b.dropoff_lng) });
        }

        mapInstance.fitBounds(bounds, { top: 100, right: 100, bottom: 100, left: 100 });
    }, [selectedDriver, mapInstance]);

    const formatRelativeTime = (timeString) => {
        if (!timeString || typeof timeString !== 'string') return 'N/A';
        const parts = timeString.split(':');
        if (parts.length < 2) return timeString;

        // Based on "00:00:15" meaning "15 mins"
        const hours = parseInt(parts[1], 10) || 0;
        const minutes = parseInt(parts[2], 10) || 0;
        const days = parseInt(parts[0], 10) || 0;

        let result = '';
        if (days > 0) result += `${days} days `;
        if (hours > 0) result += `${hours} hours `;
        if (minutes > 0 || (days === 0 && hours === 0)) result += `${minutes} mins`;

        return result.trim() || '0 mins';
    };

    const tabs = [
        { id: 'dashboard', label: 'Live Dashboard' },
        { id: 'driver', label: 'Driver Analytics' },
        { id: 'passenger', label: 'Passengers Insights' },
        { id: 'ride', label: 'Ride Analytics' },
        { id: 'financial', label: 'Financial Metrics' },
    ];

    const loadData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch statistics, analytics, and online drivers in parallel
            const [statsRes, analyticsRes, driversRes, vehicleTypesRes] = await Promise.all([
                getDashboardStats(),
                getDashboardAnalytics(),
                getOnlineDrivers(),
                getVehicleTypes()
            ]);

            // Update stats
            const sData = statsRes?.data || statsRes;
            if (sData) setStats(sData);

            // Update analytics
            const aData = analyticsRes?.data || analyticsRes;
            if (aData) setAnalytics(aData);

            // Update online drivers
            const dData = driversRes?.data || driversRes;
            if (dData && (dData.with_rides || dData.without_rides)) {
                setOnlineDrivers(dData);
            }

            // Update car types if available
            console.log("Analytics Vehicle Types Response:", vehicleTypesRes);
            const fetchedTypes = vehicleTypesRes.vehicleTypes || vehicleTypesRes.data?.vehicleTypes || [];
            if (Array.isArray(fetchedTypes)) {
                const mappedTypes = fetchedTypes.map(t => ({
                    id: t.id,
                    name: t.category,
                    label: t.category
                }));
                setCarTypes([{ name: '', label: 'All Vehicles' }, ...mappedTypes]);
            }

        } catch (error) {
            console.error("Error loading dashboard data", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter data based on date range
    const filterDataByDateRange = useCallback((data, dateField = 'date') => {
        if (!data || !Array.isArray(data)) return [];
        if (!startDate || !endDate) return data; // Skip filtering if dates are not selected

        return data.filter(item => {
            const itemDate = parseISO(item[dateField]);
            return itemDate >= startDate && itemDate <= endDate;
        });
    }, [startDate, endDate]);

    const handleGlobalPeriodChange = useCallback((e) => {
        const val = e.target.value;
        setGlobalPeriod(val);
        const now = new Date();
        if (val === 'Today') {
            setStartDate(startOfDay(now));
            setEndDate(endOfDay(now));
        } else if (val === 'This Week') {
            setStartDate(startOfWeek(now));
            setEndDate(endOfDay(now));
        } else if (val === 'This Month') {
            setStartDate(startOfMonth(now));
            setEndDate(endOfDay(now));
        } else if (val === 'This Year') {
            setStartDate(startOfYear(now));
            setEndDate(endOfDay(now));
        }
    }, [setGlobalPeriod, setStartDate, setEndDate]);

    // Memoized filtered drivers for the map
    const filteredDrivers = useMemo(() => {
        const selectedCat = carTypes.find(c => c.label.trim().toLowerCase() === selectedCarType.trim().toLowerCase());

        // ---- Diagnostic Logs ----
        if (selectedCarType !== 'All Vehicles') {
            console.log('=== FILTER DEBUG ===');
            console.log('All carTypes from API:', JSON.stringify(carTypes, null, 2));
            console.log('Active filter label:', selectedCarType);
            console.log('Resolved category:', selectedCat);
        }

        const filter = (drivers) => {
            if (!drivers) return [];
            return drivers.filter(driver => {
                const driverTypeId = driver.vehicle?.vehicle_type_id;

                if (selectedCarType !== 'All Vehicles') {
                    console.log(`Driver ${driver.id} | vehicle_type_id: ${driverTypeId} (${typeof driverTypeId}) | selectedCat.id: ${selectedCat?.id} (${typeof selectedCat?.id}) | match: ${Number(driverTypeId) === Number(selectedCat?.id)}`);
                }

                // Always show if All Vehicles, otherwise compare IDs
                const matchesType = selectedCarType === 'All Vehicles' ||
                    (selectedCat?.id !== undefined && Number(driverTypeId) === Number(selectedCat?.id));

                // Filter by search string (name, phone, or proximity)
                const searchLower = locationSearch.toLowerCase().trim();
                const matchesText = !locationSearch ||
                    `${driver.first_name} ${driver.last_name}`.toLowerCase().includes(searchLower) ||
                    driver.phone.includes(locationSearch) ||
                    driver.vehicle?.license_plate?.toLowerCase().includes(searchLower);

                // Proximity Filter: If we found a location for the search string, show drivers within 20km
                let matchesLocation = true;
                if (searchCoords && driver.tracking) {
                    const dist = getDistance(
                        searchCoords.lat, searchCoords.lng,
                        parseFloat(driver.tracking.curr_lat), parseFloat(driver.tracking.curr_lon)
                    );
                    matchesLocation = dist < 20; // 20km radius
                }

                return matchesType && (matchesText || matchesLocation);
            });
        };

        return {
            with_rides: filter(onlineDrivers.with_rides),
            without_rides: filter(onlineDrivers.without_rides)
        };
    }, [onlineDrivers, selectedCarType, locationSearch, carTypes, searchCoords]);

    // Auto-fit map to show all online drivers when dashboard tab is active and no driver is selected
    useEffect(() => {
        if (!isLoaded || !mapInstance || selectedDriver || activeTab !== 'dashboard') {
            // Keep searching state false if we are not on the dashboard or have a driver selected
            if (activeTab !== 'dashboard' || selectedDriver) setIsSearchingBounds(false);
            return;
        }

        const allDrivers = [...filteredDrivers.with_rides, ...filteredDrivers.without_rides];

        // If no online drivers are found after data loads, hide the searching popup eventually
        if (allDrivers.length === 0) {
            const timer = setTimeout(() => setIsSearchingBounds(false), 2000);
            return () => clearTimeout(timer);
        }

        const bounds = new window.google.maps.LatLngBounds();
        let hasValidCoords = false;

        allDrivers.forEach(driver => {
            if (driver.tracking?.curr_lat && driver.tracking?.curr_lon) {
                bounds.extend({
                    lat: parseFloat(driver.tracking.curr_lat),
                    lng: parseFloat(driver.tracking.curr_lon)
                });
                hasValidCoords = true;
            }
        });

        if (hasValidCoords) {
            setIsSearchingBounds(true);
            // Use a slight delay to ensure the map is ready
            const timer = setTimeout(() => {
                if (mapInstance) {
                    mapInstance.fitBounds(bounds, { top: 70, right: 70, bottom: 70, left: 70 });

                    // Robustly cap zoom level after fitBounds completes
                    const listener = window.google.maps.event.addListenerOnce(mapInstance, 'idle', () => {
                        if (mapInstance && mapInstance.getZoom() > 14) {
                            mapInstance.setZoom(14);
                        }
                    });

                    // Keep the popup visible long enough for movement to be noticeable
                    setTimeout(() => setIsSearchingBounds(false), 1200);
                } else {
                    setIsSearchingBounds(false);
                }
            }, 300);
            return () => {
                clearTimeout(timer);
                setIsSearchingBounds(false);
            };
        }
    }, [filteredDrivers.with_rides.length, filteredDrivers.without_rides.length, isLoaded, selectedDriver, activeTab, mapInstance]);

    // Initial date setup and initial searching clear fallback
    useEffect(() => {
        const now = new Date();
        setStartDate(startOfWeek(now));
        setEndDate(endOfDay(now));

        // If the map takes way too long or fails to load any drivers, clear searching after 5s
        const timer = setTimeout(() => setIsSearchingBounds(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return <Loader />;
    }

    // Get chart data from analytics
    const getActiveDriversChartData = () => {
        if (analytics?.passenger_growth) {
            return analytics.passenger_growth.slice(-7).map(item => item.total);
        }
        return [30, 50, 40, 75, 100, 60, 25]; // fallback data
    };

    const getOngoingRidesChartData = () => {
        if (analytics?.booking_trends) {
            return analytics.booking_trends.slice(-7).map(item => item.total);
        }
        return [30, 50, 100, 75, 60, 45, 20]; // fallback data
    };

    return (
        <AdminLayout title="Dashboard & Analytics">
            {/* Filters Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="relative group">
                    <select
                        value={globalPeriod}
                        onChange={handleGlobalPeriodChange}
                        className="pl-5 pr-15 py-2 bg-white border-[1.5px] border-[#666]/20 rounded-full text-[14px] font-[600] text-[#111] appearance-none outline-none focus:border-[#D10000] cursor-pointer shadow-sm"
                    >
                        <option>Today</option>
                        <option>This Week</option>
                        <option>This Month</option>
                        <option>This Year</option>
                    </select>
                    <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[#D10000] text-[12px] pointer-events-none"></i>
                </div>

                <div className="flex items-center gap-2 ml-2">
                    <div className="flex gap-2 r">
                        <div className="relative border border-[#D10000] w-[200px] rounded-full">
                            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-[30px] bg-[#D10000] flex items-center justify-center text-white z-10">
                                <i className="bi bi-calendar-check text-[14px]"></i>
                            </div>
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => setStartDate(date)}
                                placeholderText="From"
                                maxDate={new Date()}
                                dateFormat="d-MMM-yyyy"
                                className="pl-11 pr-4 py-2 bg-white border-[1.5px] border-[#666]/30 rounded-full text-[14px] font-[600] w-44 outline-none focus:border-[#D10000] transition-all shadow-sm"
                            />
                        </div>
                        <div className="relative border border-[#D10000] w-[200px] rounded-full">
                            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-[30px] bg-[#D10000] flex items-center justify-center text-white z-10">
                                <i className="bi bi-calendar-check text-[14px]"></i>
                            </div>
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => setEndDate(date)}
                                placeholderText="To"
                                minDate={startDate}
                                maxDate={new Date()}
                                dateFormat="d-MMM-yyyy"
                                className="pl-11 pr-4 py-2 bg-white rounded-full text-[14px] font-[600] outline-none focus:border-[#D10000] transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>



            {/* Sub-Navigation */}
            <div className="bg-[#D10000] rounded-full p-1.5 flex mb-4 w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-8 py-3 rounded-full text-[15px] font-[600] transition-all duration-300 ${activeTab === tab.id
                            ? 'bg-white text-[#D10000] shadow-md'
                            : 'text-white hover:bg-white/10'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in transition-all">
                {activeTab === 'dashboard' && (
                    <>
                        {/* Top KPI Summary Bar - Using real data from stats */}
                        <div className="bg-[#FF161F1A] rounded-[30px] p-8 mb-4 border border-[#FEE2E2] relative overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 items-center relative z-10">
                                {[
                                    {
                                        label: 'Total Bookings',
                                        value: stats?.total_bookings || 0,
                                        icon: 'bi-car-front-fill'
                                    },
                                    {
                                        label: 'Total Passengers',
                                        value: stats?.total_passengers || 0,
                                        icon: 'bi-people-fill'
                                    },
                                    {
                                        label: 'Active Drivers',
                                        value: stats?.total_drivers || 0,
                                        icon: 'bi-person-check-fill'
                                    },
                                    {
                                        label: 'Platform Revenue',
                                        value: `C$ ${stats?.revenue || 0}`,
                                        icon: 'bi-currency-exchange'
                                    },
                                ].map((kpi, i) => (
                                    <div key={i} className={`flex items-center gap-4 px-2 ${i < 3 ? 'border-r-2 border-[#D10000]' : ''}`}>
                                        <div className="w-[64px] h-[64px] rounded-full bg-white shadow-[0_8px_30px_rgba(209,0,0,0.08)] flex items-center justify-center shrink-0">
                                            <i className={`bi ${kpi.icon} text-[26px] text-[#D10000]`}></i>
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-[600] text-[#6B7280] mb-0.5">{kpi.label}</p>
                                            <h3 className="text-[32px] font-[600] text-[#111] leading-none tracking-tight">{kpi.value}</h3>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Vehicle Filter & Location Search Grid */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            {/* Vehicle Dropdown */}
                            <div className="relative h-[56px] col-span-1">
                                <div
                                    onClick={() => setIsSelectOpen(!isSelectOpen)}
                                    className={`group h-full relative flex items-center bg-white border-[1.5px] rounded-[30px] px-[22px] cursor-pointer transition-all duration-200 shadow-sm ${isSelectOpen ? 'border-[#D10000] ring-[5px] ring-[#e13437]/10' : 'border-[#E5E7EB] hover:border-[#D10000]'}`}
                                >
                                    <i className={`bi bi-truck mr-3 text-[20px] transition-colors ${isSelectOpen ? 'text-[#D10000]' : 'text-[#999]'}`}></i>
                                    <span className="flex-1 text-[15px] font-[600] text-[#111] truncate whitespace-nowrap mr-2">
                                        {selectedCarType}
                                    </span>
                                    <i className={`bi bi-chevron-down text-[#111] text-[12px] transition-transform duration-300 ${isSelectOpen ? 'rotate-180' : 'rotate-0'}`}></i>
                                </div>

                                {isSelectOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsSelectOpen(false)}></div>
                                        <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-[#E5E7EB] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] z-50 overflow-hidden py-3 animate-scale-up-dropdown origin-top">
                                            {carTypes.map((category) => (
                                                <div
                                                    key={category.name}
                                                    onClick={() => {
                                                        setSelectedCarType(category.label);
                                                        setIsSelectOpen(false);

                                                    }}
                                                    className={`px-6 py-2.5 text-sm font-[600] cursor-pointer transition-all duration-200 ${selectedCarType === category.label
                                                        ? 'bg-[#D10000] text-white mx-2 rounded-full shadow-md'
                                                        : 'text-[#111] hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {category.label}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="h-[56px] col-span-2 relative">
                                <SearchBar
                                    placeholder="Search location ..."
                                    value={locationSearch}
                                    onChange={(e) => {
                                        setLocationSearch(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    className="w-full h-full"
                                    style={{ height: '100%', paddingTop: 0, paddingBottom: 0 }}
                                />

                                {/* Autocomplete Suggestions Dropdown */}
                                {showSuggestions && addressSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[24px] shadow-2xl border border-gray-100 z-[100] py-3 overflow-hidden animate-fade-in">
                                        {addressSuggestions.map((suggestion) => (
                                            <div
                                                key={suggestion.place_id}
                                                onClick={() => handleSelectSuggestion(suggestion)}
                                                className="px-6 py-3 hover:bg-gray-50 flex items-center gap-3 cursor-pointer transition-colors border-b border-gray-50 last:border-none"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                                                    <i className="bi bi-geo-alt text-[#D10000]"></i>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-[600] text-[#111] line-clamp-1">{suggestion.structured_formatting.main_text}</span>
                                                    <span className="text-[11px] text-[#6B7280] font-[500] line-clamp-1">{suggestion.structured_formatting.secondary_text}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Live Map & Ongoing Ride Section */}
                        <div className={`bg-white rounded-[30px] overflow-hidden relative h-[600px] border border-[#E5E7EB] mb-6 transition-all duration-700 ease-in-out ${isResetting ? 'blur-sm scale-[0.99] opacity-90' : 'blur-0 scale-100 opacity-100'}`}>
                            {/* Auto-centering Background Notification */}
                            {isSearchingBounds && (
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in pointer-events-none">
                                    <div className="bg-white/95 backdrop-blur-md px-6 py-3 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-red-50 flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-2.5 h-2.5 bg-[#D10000] rounded-full"></div>
                                            <div className="absolute inset-0 w-2.5 h-2.5 bg-[#D10000] rounded-full animate-ping opacity-75"></div>
                                        </div>
                                        <span className="text-[14px] font-[700] text-[#111] tracking-tight">Searching Ongoing Bookings...</span>
                                    </div>
                                </div>
                            )}

                            {isLoaded ? (
                                <GoogleMap
                                    mapContainerStyle={{ width: '100%', height: '100%' }}
                                    onLoad={onLoad}
                                    center={mapCenter}
                                    zoom={selectedDriver ? 14 : 12}
                                    options={{
                                        disableDefaultUI: true,
                                        zoomControl: true,
                                        styles: [
                                            {
                                                featureType: "all",
                                                elementType: "all",
                                                stylers: [{ saturation: -100 }]
                                            }
                                        ]
                                    }}
                                >
                                    {/* Pickup & Dropoff Markers for Selected Resident Driver */}
                                    {selectedDriver?.type === 'Busy' && selectedDriver.bookings?.[0] && (
                                        <>
                                            <MarkerF
                                                position={directions ? directions.routes[0].legs[0].start_location : {
                                                    lat: parseFloat(selectedDriver.bookings[0].pickup_lat),
                                                    lng: parseFloat(selectedDriver.bookings[0].pickup_lng)
                                                }}
                                                icon={{
                                                    url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                                                    labelOrigin: { x: 12, y: -10 }
                                                }}
                                                label={{ text: "Pickup", fontSize: "12px", fontWeight: "bold", color: "#000" }}
                                            />
                                            <MarkerF
                                                position={directions ? directions.routes[0].legs[0].end_location : {
                                                    lat: parseFloat(selectedDriver.bookings[0].dropoff_lat),
                                                    lng: parseFloat(selectedDriver.bookings[0].dropoff_lng)
                                                }}
                                                icon={{
                                                    url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                                                    labelOrigin: { x: 12, y: -10 }
                                                }}
                                                label={{ text: "Dropoff", fontSize: "12px", fontWeight: "bold", color: "#D10000" }}
                                            />
                                        </>
                                    )}
                                    {directions && (
                                        <DirectionsRenderer
                                            directions={directions}
                                            options={{
                                                polylineOptions: {
                                                    strokeColor: "#D10000",
                                                    strokeWeight: 5,
                                                    strokeOpacity: 0.8
                                                },
                                                suppressMarkers: true // Hide default A/B markers to show custom ones instead
                                            }}
                                        />
                                    )}

                                    {/* Drivers WITH Rides (Busy - Red) */}
                                    {filteredDrivers.with_rides?.map(driver => (
                                        driver.tracking && (
                                            <MarkerF
                                                key={`busy-${driver.id}`}
                                                position={{
                                                    lat: parseFloat(driver.tracking.curr_lat),
                                                    lng: parseFloat(driver.tracking.curr_lon)
                                                }}
                                                icon={{
                                                    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
                                                            <path fill="#D10000" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                                                            <circle fill="white" cx="12" cy="9" r="4.5"/>
                                                            <path fill="#D10000" transform="translate(12, 9) scale(0.3) translate(-12, -13.5)" d="M17.5 6h-11c-.66 0-1.21.42-1.42 1.01L3 13v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99C18.71 6.42 18.16 6 17.5 6zM6.5 15.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm11 0c-.83 0-1.5-.67-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM6.5 11l1.5-4.5h8l1.5 4.5H6.5z"/>
                                                        </svg>
                                                    `)}`,
                                                    scaledSize: new window.google.maps.Size(40, 40),
                                                    anchor: new window.google.maps.Point(20, 37)
                                                }}
                                                onClick={() => setSelectedDriver({ ...driver, type: 'Busy' })}
                                            />
                                        )
                                    ))}

                                    {/* Drivers WITHOUT Rides (Available - Green) */}
                                    {filteredDrivers.without_rides?.map(driver => (
                                        driver.tracking && (
                                            <MarkerF
                                                key={`avail-${driver.id}`}
                                                position={{
                                                    lat: parseFloat(driver.tracking.curr_lat),
                                                    lng: parseFloat(driver.tracking.curr_lon)
                                                }}
                                                icon={{
                                                    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
                                                            <path fill="#10B981" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                                                            <circle fill="white" cx="12" cy="9" r="4.5"/>
                                                            <path fill="#10B981" transform="scale(0.35) translate(14.5, 12.5)" d="M17.5 6h-11c-.66 0-1.21.42-1.42 1.01L3 13v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99C18.71 6.42 18.16 6 17.5 6zM6.5 15.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm11 0c-.83 0-1.5-.67-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM6.5 11l1.5-4.5h8l1.5 4.5H6.5z"/>
                                                        </svg>
                                                    `)}`,
                                                    scaledSize: new window.google.maps.Size(40, 40),
                                                    anchor: new window.google.maps.Point(20, 37)
                                                }}
                                                onClick={() => setSelectedDriver({ ...driver, type: 'Available' })}
                                            />
                                        )
                                    ))}
                                    {/* No Data Overlay */}
                                    {filteredDrivers.with_rides.length === 0 && filteredDrivers.without_rides.length === 0 && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="relative bg-white/95 backdrop-blur-md px-10 py-6 rounded-[30px] shadow-2xl border border-gray-100 flex flex-col items-center gap-2 animate-fade-in pointer-events-auto group">
                                                <button
                                                    onClick={() => {
                                                        setLocationSearch('');
                                                        setSearchCoords(null);
                                                        setSelectedCarType('All Vehicles');
                                                    }}
                                                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-[#D10000] hover:bg-red-50 transition-all"
                                                >
                                                    <i className="bi bi-x-lg text-xs"></i>
                                                </button>
                                                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-1">
                                                    <i className="bi bi-geo-alt-fill text-[#D10000] text-2xl"></i>
                                                </div>
                                                <span className="text-[17px] font-[700] text-[#111]">No Matching Results</span>
                                                <p className="text-[13px] text-[#6B7280] font-[500]">We couldn't find any drivers based on your criteria.</p>

                                            </div>
                                        </div>
                                    )}
                                </GoogleMap>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 gap-4">
                                    <Loader />
                                    <p className="text-[14px] font-[600] text-[#D10000] animate-pulse">Initializing Map System...</p>
                                </div>
                            )}

                            {/* Selected Driver Detail Overlay */}
                            {selectedDriver && (
                                <div className="absolute top-[8%] right-[5%] bg-white rounded-[40px] pb-5 px-5 w-[380px] shadow-[0_15px_50px_rgba(0,0,0,0.12)] z-10 transition-all animate-fade-in max-h-[85%] overflow-y-none">
                                    <div className="flex justify-between  items-start sticky top-0 bg-white py-3 z-10">
                                        <h4 className="text-[16px] font-[600] text-[#D10000] ">
                                            {selectedDriver.type === 'Busy' ? 'Ongoing Ride Preview' : 'Driver Status'}
                                        </h4>
                                        <button
                                            onClick={() => {
                                                setIsResetting(true);
                                                setSelectedDriver(null);
                                                setDirections(null);
                                                setSelectedCarType('All Vehicles');
                                                setLocationSearch('');
                                                setSearchCoords(null);

                                                // Reset effect after animation
                                                setTimeout(() => setIsResetting(false), 700);
                                            }}
                                            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-[#D10000] transition-colors"
                                        >
                                            <i className="bi bi-x-lg text-sm"></i>
                                        </button>
                                    </div>

                                    {/* Driver Info Section */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">

                                            <div className="relative">
                                                {(() => {
                                                    const avatarPath = selectedDriver.avatar || selectedDriver.avatar_url;
                                                    const isValidAvatarPath = avatarPath && avatarPath !== 'null' && avatarPath !== 'undefined' && avatarPath !== '';
                                                    const initials = `${(selectedDriver.first_name?.[0] || 'D').toUpperCase()}${(selectedDriver.last_name?.[0] || '').toUpperCase()}`;

                                                    return (
                                                        <SafeImage
                                                            src={isValidAvatarPath ? getImageUrl(avatarPath) : null}
                                                            alt="Driver"
                                                            initials={initials}
                                                            className="w-[54px] h-[54px] rounded-[14px] object-cover border-2 border-red-50"
                                                            fallbackClassName="bg-[#D10000] border-red-100"
                                                        />
                                                    );
                                                })()}
                                            </div>
                                            <div>
                                                <h5 className="text-[15px] font-[500] text-[#111]">{selectedDriver.first_name} {selectedDriver.last_name} (Driver)</h5>
                                                <p className="text-[11px] text-[#6B7280] font-[500] uppercase tracking-wider">
                                                    {selectedDriver.phone}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="w-10 h-10 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#D10000] hover:bg-[#D10000] hover:text-white transition-all">
                                                <i className="bi bi-telephone-fill"></i>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Passenger Info Section (Only for Busy Drivers) */}
                                    {selectedDriver.type === 'Busy' && selectedDriver.bookings?.[0]?.passenger && (
                                        <div className=" mb-4">
                                            <div className="flex items-center gap-3">
                                                {(() => {
                                                    const passenger = selectedDriver.bookings[0].passenger;
                                                    const avatarPath = passenger.avatar || passenger.avatar_url;
                                                    const isValidAvatarPath = avatarPath && avatarPath !== 'null' && avatarPath !== 'undefined' && avatarPath !== '';
                                                    const initials = `${(passenger.first_name?.[0] || 'P').toUpperCase()}${(passenger.last_name?.[0] || '').toUpperCase()}`;

                                                    return (
                                                        <SafeImage
                                                            src={isValidAvatarPath ? getImageUrl(avatarPath) : null}
                                                            alt="Passenger"
                                                            initials={initials}
                                                            className="w-[54px] h-[54px] rounded-[14px] object-cover border-2 border-red-50"
                                                            fallbackClassName="bg-[#111] border-gray-200"
                                                        />
                                                    );
                                                })()}
                                                <div>
                                                    <h6 className="text-[14px] font-[500] text-[#111]">
                                                        {selectedDriver.bookings[0].passenger.first_name} {selectedDriver.bookings[0].passenger.last_name} (Passenger)
                                                    </h6>
                                                    <p className="text-[11px] text-[#6B7280]">     {selectedDriver.bookings[0].passenger.phone}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Location Timeline */}
                                    <div className="relative pl-6 mb-4">
                                        <div className="absolute left-[3px] top-[14px] bottom-[14px] w-[2px] border-l-2 border-dashed border-[#CBD5E1]"></div>

                                        {selectedDriver.type === 'Busy' ? (
                                            <>
                                                <div className="relative mb-4">
                                                    <div className="absolute -left-[27px] top-[5px] w-[11px] h-[11px] bg-black rounded-full ring-4 ring-gray-100"></div>
                                                    <h6 className="text-[10px] font-[700] text-gray-400 uppercase tracking-widest mb-1">Pickup </h6>
                                                    <p className="text-[13px] font-[500] text-[#111]">{addresses.pickup_address}</p>
                                                </div>
                                                <div className="relative">
                                                    <div className="absolute -left-[30px] top-[0px] text-[#D10000]">
                                                        <i className="bi bi-geo-alt-fill text-[18px]"></i>
                                                    </div>
                                                    <h6 className="text-[10px] font-[700] text-gray-400 uppercase tracking-widest mb-1">Dropoff</h6>
                                                    <p className="text-[13px] font-[500] text-[#111]">{addresses.dropoff_address}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="relative">
                                                <div className="absolute -left-[27px] top-[6px] w-[11px] h-[11px] bg-green-500 rounded-full ring-4 ring-green-50"></div>
                                                <h6 className="text-[10px] font-[700] text-gray-400 uppercase tracking-widest mb-1">Current Standing</h6>
                                                <p className="text-[13px] font-[500] text-[#111]">{addresses.current}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats Grid */}
                                    {selectedDriver.type === 'Busy' && selectedDriver.bookings?.[0] && (
                                        <div className="grid grid-cols-3 gap-2 border-t border-[#F1F5F9] pt-4 mb-4">
                                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                                <p className="text-[9px] font-[600] text-[#94A3B8] uppercase tracking-wider mb-1">Distance</p>
                                                <p className="text-[12px] font-[700] text-[#111]">
                                                    {parseFloat(selectedDriver.bookings[0].estimated_distance).toFixed(1)} km
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                                <p className="text-[9px] font-[600] text-[#94A3B8] uppercase tracking-wider mb-1">Est. Time</p>
                                                <p className="text-[12px] font-[700] text-[#111]">{formatRelativeTime(selectedDriver.bookings[0].estimated_time)}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                                <p className="text-[9px] font-[600] text-[#94A3B8] uppercase tracking-wider mb-1">Status</p>
                                                <p className="text-[12px] font-[700] text-[#D10000] capitalize truncate">{selectedDriver.bookings[0].status}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Vehicle Info Section */}
                                    <div className="flex items-center gap-4 border-t border-[#F1F5F9] pt-4">
                                        <div className="w-16 h-12 rounded-[14px] overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-100 p-1">
                                            {selectedDriver.vehicle?.type?.image_path ? (
                                                <img
                                                    src={getImageUrl(selectedDriver.vehicle.type.image_path)}
                                                    alt="Vehicle"
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <i className="bi bi-car-front-fill text-2xl text-gray-300"></i>
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <div className="flex items-center gap-2 truncate">
                                                    <div className="w-2 h-2 bg-black rounded-full shrink-0"></div>
                                                    <span className="text-[13px] font-[700] text-[#111] truncate">{selectedDriver.vehicle?.model || 'Unknown Model'}</span>
                                                </div>
                                                <span className="text-[10px] font-[700] bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 whitespace-nowrap">
                                                    {selectedDriver.vehicle?.type?.capacity ? `${selectedDriver.vehicle.type.capacity} Seats` : 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex gap-1.5 mt-1">
                                                <p className="text-[11px] font-[500] text-[#6B7280] truncate">
                                                    {selectedDriver.vehicle?.license_plate}
                                                </p>
                                                <span className="text-[#D10000] uppercase font-[700] text-[9px] bg-red-50 px-2 py-0.5 rounded-md border border-red-100/50">
                                                    {selectedDriver.vehicle?.type?.category}
                                                </span>

                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
                {activeTab === 'driver' && (
                    <DriverAnalytics
                        bookingTrends={filterDataByDateRange(analytics?.booking_trends)}
                        period={globalPeriod}
                        onPeriodChange={handleGlobalPeriodChange}
                    />
                )}
                {activeTab === 'passenger' && (
                    <PassengerAnalytics
                        passengerGrowth={filterDataByDateRange(analytics?.passenger_growth)}
                        period={globalPeriod}
                        onPeriodChange={handleGlobalPeriodChange}
                    />
                )}
                {activeTab === 'ride' && (
                    <RideAnalytics
                        bookingTrends={filterDataByDateRange(analytics?.booking_trends)}
                        period={globalPeriod}
                        onPeriodChange={handleGlobalPeriodChange}
                    />
                )}
                {activeTab === 'financial' && (
                    <FinancialAnalytics
                        bookingTrends={filterDataByDateRange(analytics?.booking_trends)}
                        period={globalPeriod}
                        onPeriodChange={handleGlobalPeriodChange}
                    />
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.4s ease-out; }
                .react-datepicker-wrapper { display: block; }
                .react-datepicker__input-container input { width: 100%; border: none; background: transparent; }
                .react-datepicker-popper { z-index: 9999 !important; }
                .react-datepicker {
                    border: 1.5px solid #D10000 !important;
                    border-radius: 20px !important;
                    overflow: hidden;
                    font-family: inherit !important;
                    box-shadow: 0 10px 30px rgba(209,0,0,0.15) !important;
                }
                .react-datepicker__header {
                    background-color: #D10000 !important;
                    border-bottom: none !important;
                    padding-top: 15px !important;
                }
                .react-datepicker__navigation {
                    top: 15px !important;
                }
                .react-datepicker__current-month {
                    color: white !important;
                    font-weight: 700 !important;
                    font-size: 15px !important;
                    margin-bottom: 8px !important;
                }
                .react-datepicker__day-name {
                    color: #111 !important;
                    font-weight: 700 !important;
                }
                .react-datepicker__day--selected, .react-datepicker__day--keyboard-selected {
                    background-color: #D10000 !important;
                    color: white !important;
                    border-radius: 8px !important;
                }
                .react-datepicker__day--selected:hover, .react-datepicker__day--keyboard-selected:hover {
                    background-color: #D10000 !important;
                    color: white !important;
                }
                .react-datepicker__day:not(.react-datepicker__day--selected):not(.react-datepicker__day--keyboard-selected):hover {
                    background-color: #FFF1F1 !important;
                    border-radius: 8px !important;
                }
                .react-datepicker__navigation-icon::before {
                    border-color: white !important;
                }
                @keyframes scale-up-dropdown {
                    from { opacity: 0; transform: scaleY(0.95) translateY(-5px); }
                    to { opacity: 1; transform: scaleY(1) translateY(0); }
                }
                .animate-scale-up-dropdown { animation: scale-up-dropdown 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
            ` }} />
        </AdminLayout >
    );
}

// Driver Analytics Component with Real Data
function DriverAnalytics({ bookingTrends, period, onPeriodChange }) {

    // Transform booking trends for chart display
    const chartData = useMemo(() => {
        if (!bookingTrends || bookingTrends.length === 0) return [];

        return bookingTrends.map(item => ({
            name: format(parseISO(item.date), 'MMM dd'),
            hours: item.total // Using bookings count as hours for demo
        }));
    }, [bookingTrends]);

    return (
        <div className="space-y-5">
            <div className="bg-[#FF161F1A] rounded-[30px] p-8 mb-4 border border-[#FEE2E2] relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-center relative z-10">
                    {[
                        {
                            label: 'Total Bookings',
                            value: bookingTrends?.reduce((sum, item) => sum + item.total, 0) || 0,
                            icon: 'bi-car-front-fill'
                        },
                        {
                            label: 'Peak Day',
                            value: bookingTrends?.length > 0
                                ? format(parseISO(bookingTrends.reduce((max, item) =>
                                    item.total > max.total ? item : max
                                ).date), 'MMM dd')
                                : 'N/A',
                            icon: 'bi-calendar-heart-fill'
                        }
                    ].map((kpi, i) => (
                        <div key={i} className={`flex items-center gap-4 px-6 ${i === 0 ? 'border-r-2 border-[#D10000]' : ''}`}>
                            <div className="w-[64px] h-[64px] rounded-full bg-white shadow-[0_8px_30px_rgba(209,0,0,0.08)] flex items-center justify-center shrink-0">
                                <i className={`bi ${kpi.icon} text-[26px] text-[#D10000]`}></i>
                            </div>
                            <div>
                                <p className="text-[14px] font-[600] text-[#6B7280] mb-0.5">{kpi.label}</p>
                                <h3 className="text-[32px] font-[600] text-[#111] leading-none tracking-tight">{kpi.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm">
                    <ModuleHeader title="Booking Trends" period={period} onPeriodChange={onPeriodChange} />
                    <div className="h-[300px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                                <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="hours" fill="#3B82F6" radius={[8, 8, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm relative flex flex-col">
                    <h4 className="text-[18px] font-[600] text-[#111] mb-6">Booking Summary</h4>
                    <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-2.5 bg-[#3B82F6] rounded-full"></div>
                                <span className="text-[13px] font-[600] text-[#6B7280]">
                                    Total Bookings <span className="text-[#D10000]">{bookingTrends?.reduce((sum, item) => sum + item.total, 0) || 0}</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-2.5 bg-[#EC4899] rounded-full"></div>
                                <span className="text-[13px] font-[600] text-[#6B7280]">
                                    Total Days <span className="text-[#10B981]}">{bookingTrends?.length || 0}</span>
                                </span>
                            </div>
                        </div>
                        <div className="h-[200px] w-full self-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[
                                        {
                                            name: 'Avg Daily', value: bookingTrends?.length > 0
                                                ? Math.round(bookingTrends.reduce((sum, item) => sum + item.total, 0) / bookingTrends.length)
                                                : 0, color: '#3B82F6'
                                        }
                                    ]} innerRadius={60} outerRadius={85} dataKey="value" stroke="none">
                                        <Cell fill="#3B82F6" />
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Passenger Analytics with Real Data
function PassengerAnalytics({ passengerGrowth, period, onPeriodChange }) {

    const chartData = useMemo(() => {
        if (!passengerGrowth || passengerGrowth.length === 0) return [];

        return passengerGrowth.map(item => ({
            name: format(parseISO(item.date), 'MMM dd'),
            oneTime: item.total,
            repeat: Math.floor(item.total * 0.6) // Example split - adjust based on your actual data
        }));
    }, [passengerGrowth]);

    const totalPassengers = passengerGrowth?.reduce((sum, item) => sum + item.total, 0) || 0;
    const avgGrowth = passengerGrowth?.length > 0
        ? Math.round(totalPassengers / passengerGrowth.length)
        : 0;

    return (
        <div className="space-y-5">
            <div className="bg-[#FF161F1A] rounded-[30px] p-8 mb-4 border border-[#FEE2E2] relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-center relative z-10">
                    {[
                        {
                            label: 'Total Passengers (All Time)',
                            value: totalPassengers,
                            icon: 'bi-people-fill'
                        },
                        {
                            label: 'Average Daily Growth',
                            value: avgGrowth,
                            icon: 'bi-graph-up-arrow'
                        }
                    ].map((kpi, i) => (
                        <div key={i} className={`flex items-center gap-4 px-6 ${i === 0 ? 'border-r-2 border-[#D10000]' : ''}`}>
                            <div className="w-[64px] h-[64px] rounded-full bg-white shadow-[0_8px_30px_rgba(209,0,0,0.08)] flex items-center justify-center shrink-0">
                                <i className={`bi ${kpi.icon} text-[26px] text-[#D10000]`}></i>
                            </div>
                            <div>
                                <p className="text-[14px] font-[600] text-[#6B7280] mb-0.5">{kpi.label}</p>
                                <h3 className="text-[32px] font-[600] text-[#111] leading-none tracking-tight">{kpi.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm">
                    <ModuleHeader title="Passenger Growth Over Time" period={period} onPeriodChange={onPeriodChange} />
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="oneTime" stroke="#3B82F6" strokeWidth={4} fillOpacity={0.1} fill="#3B82F6" />
                                <Area type="monotone" dataKey="repeat" stroke="#10B981" strokeWidth={4} fillOpacity={0.1} fill="#10B981" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm relative flex flex-col">
                    <h4 className="text-[18px] font-[600] text-[#111] mb-6">Growth Statistics</h4>
                    <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-2.5 bg-[#3B82F6] rounded-full"></div>
                                <span className="text-[13px] font-[600] text-[#6B7280]">
                                    Total Passengers <span className="text-[#D10000]">{totalPassengers}</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-2.5 bg-[#EC4899] rounded-full"></div>
                                <span className="text-[13px] font-[600] text-[#6B7280]">
                                    Record Date <span className="text-[#10B981]}">
                                        {passengerGrowth?.length > 0
                                            ? format(parseISO(passengerGrowth.reduce((max, item) =>
                                                item.total > max.total ? item : max
                                            ).date), 'MMM dd, yyyy')
                                            : 'N/A'}
                                    </span>
                                </span>
                            </div>
                        </div>
                        <div className="h-[200px] w-full self-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[{ v: passengerGrowth?.length || 0, c: '#EC4899' }]} innerRadius={55} outerRadius={80} dataKey="v" stroke="none">
                                        <Cell fill="#EC4899" />
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Ride Analytics with Real Data
function RideAnalytics({ bookingTrends, period, onPeriodChange }) {

    const chartData = useMemo(() => {
        if (!bookingTrends || bookingTrends.length === 0) return [];

        return bookingTrends.map(item => ({
            name: format(parseISO(item.date), 'MMM dd'),
            volume: item.total
        }));
    }, [bookingTrends]);

    const totalRides = bookingTrends?.reduce((sum, item) => sum + item.total, 0) || 0;
    const avgRides = bookingTrends?.length > 0 ? Math.round(totalRides / bookingTrends.length) : 0;

    return (
        <div className="space-y-5">
            <div className="bg-[#FF161F1A] rounded-[30px] p-8 mb-4 border border-[#FEE2E2] relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 items-center relative z-10">
                    {[
                        { label: 'Total Rides', value: totalRides, icon: 'bi-car-front-fill' },
                        { label: 'Average Daily', value: avgRides, icon: 'bi-calendar-check-fill' },
                        {
                            label: 'Peak Day Volume', value: bookingTrends?.length > 0
                                ? Math.max(...bookingTrends.map(item => item.total))
                                : 0,
                            icon: 'bi-graph-up-arrow'
                        },
                    ].map((kpi, i) => (
                        <div key={i} className={`flex items-center gap-4 px-6 ${i < 2 ? 'border-r-2 border-[#D10000]' : ''}`}>
                            <div className="w-[64px] h-[64px] rounded-full bg-white shadow-[0_8px_30px_rgba(209,0,0,0.08)] flex items-center justify-center shrink-0">
                                <i className={`bi ${kpi.icon} text-[26px] text-[#D10000]`}></i>
                            </div>
                            <div>
                                <p className="text-[14px] font-[600] text-[#6B7280] mb-0.5">{kpi.label}</p>
                                <h3 className="text-[32px] font-[600] text-[#111] leading-none tracking-tight">{kpi.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm">
                    <ModuleHeader title="Ride Volume Over Time" period={period} onPeriodChange={onPeriodChange} />
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorVolumeR" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#D10000" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#D10000" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="volume" stroke="#D10000" strokeWidth={4} fillOpacity={1} fill="url(#colorVolumeR)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-3">
                    <div className="bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm">
                        <h4 className="text-[18px] font-[600] text-[#111] mb-6">Ride Statistics</h4>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#FFF1F1] flex items-center justify-center text-[#D10000]">
                                    <i className="bi bi-calendar-week text-[18px]"></i>
                                </div>
                                <span className="text-[15px] font-[600] text-[#111]">
                                    Total Days: {bookingTrends?.length || 0}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#FFF1F1] flex items-center justify-center text-[#D10000]">
                                    <i className="bi bi-trophy-fill text-[18px]"></i>
                                </div>
                                <span className="text-[15px] font-[600] text-[#111]">
                                    Highest: {bookingTrends?.length > 0
                                        ? Math.max(...bookingTrends.map(item => item.total))
                                        : 0} rides/day
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm">
                        <h4 className="text-[18px] font-[600] text-[#111] mb-6">Period Summary</h4>
                        <div className="space-y-5">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-[12px] font-[600] text-[#6B7280] uppercase">Total Rides</span>
                                    <span className="text-[12px] font-[600] text-[#111]">{totalRides}</span>
                                </div>
                                <div className="w-full h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min((totalRides / (totalRides + 100)) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-[12px] font-[600] text-[#6B7280] uppercase">Avg Daily</span>
                                    <span className="text-[12px] font-[600] text-[#111]">{avgRides}</span>
                                </div>
                                <div className="w-full h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                                    <div className="h-full bg-[#D10000] rounded-full" style={{ width: `${Math.min((avgRides / 100) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Financial Analytics with Real Data
function FinancialAnalytics({ bookingTrends, period, onPeriodChange }) {

    const chartData = useMemo(() => {
        if (!bookingTrends || bookingTrends.length === 0) return [];

        // Example: Calculate revenue based on bookings (e.g., $50 per booking)
        return bookingTrends.map(item => ({
            name: format(parseISO(item.date), 'MMM dd'),
            amount: item.total * 50
        }));
    }, [bookingTrends]);

    const totalRevenue = chartData.reduce((sum, item) => sum + item.amount, 0);
    const totalBookings = bookingTrends?.reduce((sum, item) => sum + item.total, 0) || 0;

    return (
        <div className="space-y-5">
            <div className="bg-[#FF161F1A] rounded-[30px] p-8 mb-4 border border-[#FEE2E2] relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-center relative z-10">
                    {[
                        {
                            label: 'Total Revenue',
                            value: `C$ ${totalRevenue.toLocaleString()}`,
                            icon: 'bi-currency-exchange'
                        },
                        {
                            label: 'Avg Per Day',
                            value: `C$ ${bookingTrends?.length > 0 ? Math.round(totalRevenue / bookingTrends.length).toLocaleString() : 0}`,
                            icon: 'bi-graph-up-arrow'
                        }
                    ].map((kpi, i) => (
                        <div key={i} className={`flex items-center gap-4 px-6 ${i === 0 ? 'border-r-2 border-[#D10000]' : ''}`}>
                            <div className="w-[64px] h-[64px] rounded-full bg-white shadow-[0_8px_30px_rgba(209,0,0,0.08)] flex items-center justify-center shrink-0">
                                <i className={`bi ${kpi.icon} text-[26px] text-[#D10000]`}></i>
                            </div>
                            <div>
                                <p className="text-[14px] font-[600] text-[#6B7280] mb-0.5">{kpi.label}</p>
                                <h3 className="text-[32px] font-[600] text-[#111] leading-none tracking-tight">{kpi.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm">
                    <ModuleHeader title="Revenue Trend" period={period} onPeriodChange={onPeriodChange} />
                    <div className="h-[300px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                    formatter={(value) => [`C$ ${value.toLocaleString()}`, 'Revenue']}
                                />
                                <Line type="monotone" dataKey="amount" stroke="#D10000" strokeWidth={5} dot={{ r: 6, fill: '#D10000', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm flex flex-col">
                    <h4 className="text-[18px] font-[600] text-[#111] mb-6">Revenue Summary</h4>
                    <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-[#D10000]"></div>
                                <span className="text-[13px] font-[600] text-[#6B7280]">
                                    Total Revenue <span className="text-[#111]">C$ {totalRevenue.toLocaleString()}</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-[#F87171]"></div>
                                <span className="text-[13px] font-[600] text-[#6B7280]">
                                    Total Bookings <span className="text-[#111]">{totalBookings}</span>
                                </span>
                            </div>
                        </div>
                        <div className="h-[200px] w-full self-end mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[{ value: totalRevenue, color: '#D10000' }]} innerRadius={55} outerRadius={80} dataKey="value" stroke="none">
                                        <Cell fill="#D10000" />
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Components
function ModuleHeader({ title, period, onPeriodChange }) {
    return (
        <div className="flex justify-between items-center mb-6">
            <h4 className="text-[18px] font-[600] text-[#111]">{title}</h4>
            <div className="relative">
                <select
                    value={period}
                    onChange={onPeriodChange}
                    className="border-[1.5px] border-[#666]/20 rounded-full px-5 py-2 text-[12px] font-[600] text-[#111] outline-none bg-white appearance-none pr-10 hover:border-[#D10000] cursor-pointer"
                >
                    <option>Today</option>
                    <option>This Week</option>
                    <option>This Month</option>
                    <option>This Year</option>
                </select>
                <i className="bi bi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[#D10000] text-[10px] pointer-events-none"></i>
            </div>
        </div>
    );
}