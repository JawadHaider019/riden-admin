import React, { useState, useEffect, useCallback } from 'react';
import { startOfWeek } from 'date-fns';
import AdminLayout from '@/layouts/AdminLayout';
import { Badge, SearchBar, Tabs, Pagination, DateRangePicker, DatePickerStyles, Loader, useToast, DeleteModal } from '@/components/UI';
import { getReviews, deleteReview } from '@/api/reviewApi';
import { getDriverById } from '@/api/driverApi';
import { getPassengerById } from '@/api/passengerApi';
import { getImageUrl } from '@/api/api';
import { format } from 'date-fns';

// Cache for resolved users to avoid redundant API calls
const userCache = {
    Driver: {},
    Passenger: {}
};

function UserDisplay({ initialUser, type, id }) {
    const [user, setUser] = useState(initialUser);
    const [loading, setLoading] = useState(!initialUser);
    const role = type?.includes('Driver') ? 'Driver' : 'Passenger';

    useEffect(() => {
        if (initialUser) {
            setUser(initialUser);
            setLoading(false);
            return;
        }

        // Check cache first
        if (userCache[role][id]) {
            setUser(userCache[role][id]);
            setLoading(false);
            return;
        }

        const resolve = async () => {
            try {
                let res;
                if (role === 'Driver') {
                    res = await getDriverById(id);
                } else {
                    res = await getPassengerById(id);
                }
                const userData = res.driver || res.data || res;
                if (userData) {
                    userCache[role][id] = userData;
                    setUser(userData);
                }
            } catch (err) {
                console.error(`Failed to resolve ${role} ${id}:`, err);
            } finally {
                setLoading(false);
            }
        };

        resolve();
    }, [initialUser, role, id]);

    if (loading) return <span className="animate-pulse bg-gray-100 px-2 rounded">{role} #{id}...</span>;

    const name = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : `${role} #${id}`;
    return <span>{name}</span>;
}

export default function ReviewManagement() {
    const [tab, setTab] = useState('driver');
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [reviewData, setReviewData] = useState({ total: 0, data: [] });
    const [stats, setStats] = useState(null);
    const { showToast } = useToast();

    // Delete Modal State
    const [deleteId, setDeleteId] = useState(null);

    const fetchReviews = useCallback(async () => {
        try {
            setLoading(true);
            const typeParam = tab === 'driver' ? 'App\\Models\\Driver' : 'App\\Models\\User';

            const res = await getReviews({
                type: typeParam,
                page,
                search: search || undefined,
            });

            if (res.status === 'success') {
                setReviewData(res.data);
                setStats(res.stats);
            }
        } catch (error) {
            console.error("Error fetching reviews:", error);
            showToast("Failed to load reviews", "error");
        } finally {
            setLoading(false);
        }
    }, [tab, page, search, showToast]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            const res = await deleteReview(deleteId);
            if (res.status === 'success') {
                showToast("Review deleted successfully", "success");
                fetchReviews();
            }
        } catch (error) {
            showToast("Failed to delete review", "error");
        } finally {
            setDeleteId(null);
        }
    };

    const ratingDistribution = stats ? [
        { stars: 5, count: stats.stars['5'], width: `${(stats.stars['5'] / stats.total_reviews) * 100 || 0}%`, color: '#12B76A' },
        { stars: 4, count: stats.stars['4'], width: `${(stats.stars['4'] / stats.total_reviews) * 100 || 0}%`, color: '#6CE9A6' },
        { stars: 3, count: stats.stars['3'], width: `${(stats.stars['3'] / stats.total_reviews) * 100 || 0}%`, color: '#FDB022' },
        { stars: 2, count: stats.stars['2'], width: `${(stats.stars['2'] / stats.total_reviews) * 100 || 0}%`, color: '#F97066' },
        { stars: 1, count: stats.stars['1'], width: `${(stats.stars['1'] / stats.total_reviews) * 100 || 0}%`, color: '#D92D20' },
    ] : [];

    return (
        <AdminLayout title="Reviews & Ratings">
            <DatePickerStyles />
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <SearchBar
                    placeholder="Search reviews..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full lg:w-[360px]"
                />
            </div>

            <Tabs
                activeTab={tab}
                onTabChange={(id) => { setTab(id); setPage(1); }}
                options={[
                    { id: 'driver', label: 'Drivers Reviews' },
                    { id: 'passenger', label: 'Passengers Reviews' }
                ]}
            />

            {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-white border border-[#E5E7EB] rounded-[20px] mb-8 relative overflow-hidden">
                    <div className="space-y-3">
                        <p className="text-[13px] font-[600] text-[#6B7280] uppercase tracking-wider">Total Reviews</p>
                        <h2 className="text-[42px] font-[600] text-[#111] leading-none">{stats.total_reviews}</h2>
                        <p className={`text-[12px] font-[600] flex items-center gap-1.5 w-fit px-3 py-1 rounded-full ${stats.growth_rate && stats.growth_rate.startsWith('-') ? 'text-[#D92D20] bg-red-50' : 'text-[#12B76A] bg-[#ECFDF3]'}`}>
                            <i className={`bi bi-graph-${stats.growth_rate && stats.growth_rate.startsWith('-') ? 'down' : 'up'}-arrow text-[10px]`}></i> {stats.growth_rate || '0%'} Growth rate this year
                        </p>
                    </div>
                    <div className="space-y-3 md:border-l border-[#F3F4F6] md:ps-8">
                        <p className="text-[13px] font-[600] text-[#6B7280] uppercase tracking-wider">Average Rating</p>
                        <div className="flex items-center gap-3">
                            <h2 className="text-[42px] font-[600] text-[#111] leading-none">{stats.average_rating}</h2>
                            <div className="flex text-[#FBBF24] text-xl gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <i key={s} className={`bi bi-star${s <= Math.floor(stats.average_rating) ? '-fill' : s <= stats.average_rating ? '-half' : ''} ${s > Math.ceil(stats.average_rating) ? 'text-[#E5E7EB]' : ''}`}></i>
                                ))}
                            </div>
                        </div>
                        <p className="text-[12px] text-[#9CA3AF] font-[600]">Average rating this year</p>
                    </div>
                    <div className="space-y-2 md:border-l border-[#F3F4F6] md:ps-8 flex flex-col justify-center">
                        {ratingDistribution.map((r) => (
                            <div key={r.stars} className="flex items-center gap-3">
                                <div className="flex-1 h-[8px] bg-[#F3F4F6] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: r.width, backgroundColor: r.color }}></div>
                                </div>
                                <span className="text-[11px] font-[600] text-[#9CA3AF] w-[28px] text-right">{r.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-white border border-[#E5E7EB] rounded-[20px] mb-8 animate-pulse">
                    <div className="h-24 bg-gray-50 rounded-xl"></div>
                    <div className="h-24 bg-gray-50 rounded-xl"></div>
                    <div className="h-24 bg-gray-50 rounded-xl"></div>
                </div>
            )}

            {loading ? <Loader /> : (
                <div className="space-y-5">
                    {reviewData.data?.length > 0 ? reviewData.data.map((r, i) => {
                        const receiver = r.receiver;
                        const sender = r.sender;
                        const receiverImg = receiver?.avatar ? getImageUrl(receiver.avatar) : receiver?.avatar_url || `https://ui-avatars.com/api/?name=${r.receiver_type?.includes('Driver') ? 'D' : 'P'}&background=random`;

                        return (
                            <div key={r.id} className="p-7 bg-white border border-[#E5E7EB] rounded-[20px] hover:shadow-lg hover:shadow-black/[0.03] transition-all duration-300 group">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100">
                                            <img src={receiverImg} className="w-full h-full object-cover" alt="User" />
                                        </div>
                                        <div>
                                            <h4 className="text-[16px] font-[600] text-[#111]">
                                                <UserDisplay
                                                    initialUser={receiver}
                                                    type={r.receiver_type}
                                                    id={r.receiver_id}
                                                />
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex gap-0.5 text-[#FBBF24] text-[14px]">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <i key={star} className={`bi bi-star${star <= r.rating ? '-fill' : ''}`}></i>
                                                    ))}
                                                </div>
                                                <span className="font-[600] text-[#9CA3AF] text-[13px]">({r.rating})</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <p className="text-[13px] font-[600] text-[#9CA3AF]">
                                            {r.created_at ? format(new Date(r.created_at), 'dd-MM-yyyy hh:mma') : 'N/A'}
                                        </p>
                                        <span className="bg-[#D10000] text-white px-4 py-1 rounded-full text-[11px] font-[600]">Booking ID #{r.booking_id}</span>
                                    </div>
                                </div>

                                <p className="text-[14px] text-[#4B5563] leading-[1.85] font-[500] mb-5">
                                    {r.review_text || 'No comment provided.'}
                                </p>

                                <div className="flex justify-between items-center pt-5 border-t border-[#F3F4F6]">
                                    <p className="text-[13px] font-[600] text-[#9CA3AF]">
                                        By {r.sender_type?.includes('Driver') ? 'Driver' : 'Passenger'}{' '}
                                        <span className="text-[#D10000] font-[600] cursor-pointer hover:underline underline-offset-2">
                                            <UserDisplay
                                                initialUser={sender}
                                                type={r.sender_type}
                                                id={r.sender_id}
                                            />
                                        </span>
                                    </p>
                                    <button
                                        onClick={() => setDeleteId(r.id)}
                                        className="w-8 h-8 rounded-lg bg-[#FEE4E2] text-[#D10000] hover:bg-[#D10000] hover:text-white transition-all flex items-center justify-center"
                                    >
                                        <i className="bi bi-trash3-fill text-[13px]"></i>
                                    </button>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="bg-white rounded-[20px] p-10 text-center text-gray-500 border border-gray-100">
                            <i className="bi bi-star text-4xl mb-3 block"></i>
                            <p>No reviews found for this category.</p>
                        </div>
                    )}
                </div>
            )}

            {reviewData.total > (reviewData.per_page || 15) && (
                <div className="mt-8">
                    <Pagination
                        currentPage={page}
                        totalItems={reviewData.total}
                        itemsPerPage={reviewData.per_page || 15}
                        onPageChange={setPage}
                    />
                </div>
            )}

            <DeleteModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Delete Review?"
                itemName={`Review #${deleteId}`}
            />
        </AdminLayout>
    );
}
