import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logoutAdmin } from '../api/auth'
import { useToast } from '@/components/UI';

export default function Sidebar({ isCollapsed, setIsCollapsed }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const url = location.pathname;
    const admin = JSON.parse(localStorage.getItem('admin') || '{}');

    const handleLogout = async () => {
        try {
            await logoutAdmin();
            localStorage.removeItem('token');
            localStorage.removeItem('admin');
            showToast('Logged out successfully', 'success');
            setTimeout(() => {
                navigate('/auth/login');
            }, 300);
        } catch (error) {
            showToast(error.response?.data?.message || 'Logout failed', 'error');
        }
    };

    const [expandedMenu, setExpandedMenu] = React.useState(null);

    const toggleSubmenu = (e, label) => {
        e.preventDefault();
        setExpandedMenu(expandedMenu === label ? null : label);
    };
    const hasPermission = (permission) => {
        // If no permission specified, allow it
        if (!permission) return true;

        const adminStr = localStorage.getItem('admin');
        if (!adminStr || adminStr === '{}') return true; // Fallback during transition or if data missing

        let adminObj = {};
        try {
            adminObj = JSON.parse(adminStr);
        } catch (e) {
            return true;
        }

        if (Object.keys(adminObj).length === 0) return true;

        // Super admin check (lenient type checking)
        if (adminObj.is_super == true || adminObj.is_super == 1 || adminObj.is_super == '1') {
            return true;
        }

        // Check modules
        let userModules = adminObj.modules;
        if (!userModules) return false;

        // Handle if modules is a string (some backends return JSON as string)
        if (typeof userModules === 'string') {
            try {
                userModules = JSON.parse(userModules);
            } catch (e) {
                userModules = userModules.split(',').map(m => m.trim());
            }
        }

        if (!Array.isArray(userModules)) return false;

        return userModules.includes(permission);
    };

    const menuItems = [
        { label: 'Analytics & Dashboard', icon: 'bi bi-grid-1x2', href: '/', public: true },
        { label: 'User Management', icon: 'bi bi-person', href: '/users', superOnly: true },
        {
            label: 'Driver Management',
            icon: 'bi bi-person-badge',
            permission: 'Driver Management',
            subItems: [
                { label: 'Driver Directory', href: '/drivers' },
                { label: 'Driver Requests', href: '/drivers/requests' }
            ]
        },
        {
            label: 'Passenger Management',
            icon: 'bi bi-people',
            permission: 'Passenger Management',
            subItems: [
                { label: 'Passenger Directory', href: '/passenger' },
                { label: 'Passenger Requests', href: '/passenger/requests' }
            ]
        },
        { label: 'Booking Management', icon: 'bi bi-calendar-check', href: '/bookings', permission: 'Booking Management' },
        { label: 'Vehicle Management', icon: 'bi bi-truck', href: '/vehicles', permission: 'Vehicles Management' },
        { label: 'Reviews & Ratings', icon: 'bi bi-star', href: '/reviews', permission: 'Reviews & Ratings' },
        { label: 'Promo code Management', icon: 'bi bi-tag', href: '/promo-management', permission: 'Promo code Management' },
        { label: 'Fare Management', icon: 'bi bi-cash-coin', href: '/fare-management', permission: 'Fare Management' },
        { label: 'Commission Management', icon: 'bi bi-percent', href: '/commission-management', permission: 'Commission Management' },
        { label: 'Drivers Payouts', icon: 'bi bi-credit-card', href: '/payout-management', permission: 'Payment Management' },
        { label: 'Report Management', icon: 'bi bi-file-earmark-text', href: '/report-management', permission: 'Report Management' },
        {
            label: 'Support Ticket',
            icon: 'bi bi-life-preserver',
            permission: 'Support Ticket', href: '/support'

        }];

    React.useEffect(() => {
        const activeItem = menuItems.find(item => item.subItems && item.subItems.some(sub => url === sub.href || url.startsWith(sub.href + '/')));
        if (activeItem) {
            setExpandedMenu(activeItem.label);
        }
    }, [url]);

    return (
        <aside className={`fixed left-0 top-0 bottom-0 bg-[#D10000] text-white z-[1030] overflow-x-hidden flex flex-col transition-all duration-300 ${isCollapsed ? 'w-[60px]' : 'w-[260px]'}`}>
            <div className="h-full flex flex-col overflow-hidden relative w-full">
                {/* Header with Logo and Toggle */}
                <div className={`relative flex transition-all duration-300 ${isCollapsed ? 'flex-col items-center py-4 gap-4 pr-2' : 'flex-row items-center min-h-[72px] px-4'}`}>
                    {isCollapsed ? (
                        <>
                            <button
                                onClick={() => setIsCollapsed(false)}
                                className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg transition-all z-[110]"
                                title="Expand Sidebar"
                            >
                                <i className="bi bi-list text-xl text-white"></i>
                            </button>
                            <Link to="/" className="flex items-center hover:text-white no-underline transition-all duration-300">
                                <img
                                    src="/icon.png"
                                    className="w-8 h-8 object-contain"
                                    alt="Logo"
                                />
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link to="/" className="flex items-center hover:text-white no-underline transition-all duration-300">
                                <img
                                    src="/icon.png"
                                    className="w-10 h-10 mr-2 object-contain"
                                    alt="Logo"
                                />
                                <div className="transition-all duration-300 font-['Audiowide'] text-[24px] tracking-wider text-white">
                                    <span>RIDEN</span>
                                </div>
                            </Link>

                            <button
                                onClick={() => setIsCollapsed(true)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg transition-all z-[110]"
                                title="Collapse Sidebar"
                            >
                                <i className="bi bi-list text-xl text-white"></i>
                            </button>
                        </>
                    )}
                </div>

                <nav className="flex-1 flex flex-col gap-1  overflow-y-auto overflow-x-hidden px-0 riden-scrollbar">
                    {menuItems
                        .filter(item => {
                            if (item.public) return true;
                            if (item.superOnly) return admin?.is_super;
                            return hasPermission(item.permission);
                        })
                        .map((item, index) => {
                            const hasSub = !!item.subItems;
                            const isExpanded = expandedMenu === item.label;
                            const isActive = item.href && item.href !== '#' && !hasSub && (url === item.href || url.startsWith(item.href + '/'));
                            const isSubActive = hasSub && item.subItems.some(sub => url === sub.href || url.startsWith(sub.href + '/'));
                            const isHighlighted = isActive || isSubActive;

                            return (
                                <div key={index} className="flex flex-col">
                                    {hasSub ? (
                                        <button
                                            onClick={(e) => {
                                                if (isCollapsed) {
                                                    // In collapsed mode, navigate to the first sub-item instead of expanding
                                                    const firstSubHref = item.subItems?.[0]?.href;
                                                    if (firstSubHref) navigate(firstSubHref);
                                                } else {
                                                    toggleSubmenu(e, item.label);
                                                }
                                            }}
                                            className={`flex items-center gap-2 py-1 lg:py-2 px-3 rounded-r-full text-[12px] font-[600] transition-all duration-300 relative group overflow-hidden w-full ${isHighlighted
                                                ? 'bg-white text-[#D10000]'
                                                : 'text-white/90 hover:bg-white/10'
                                                }`}
                                            title={isCollapsed ? item.label : ''}
                                        >
                                            <i className={`${item.icon} text-lg w-[24px] text-center shrink-0`} aria-hidden="true"></i>
                                            {!isCollapsed && (
                                                <span className="flex-1 text-left whitespace-nowrap">
                                                    {item.label}
                                                </span>
                                            )}
                                            {!isCollapsed && (
                                                <i className={`bi bi-chevron-down text-[12px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                                            )}
                                        </button>
                                    ) : (
                                        <Link
                                            to={item.href}
                                            className={`flex items-center gap-2 py-1 lg:py-2 px-3 rounded-r-full text-[12px] font-[600] transition-all duration-300 relative group overflow-hidden ${isActive
                                                ? 'bg-white text-[#D10000]'
                                                : 'text-white/90 hover:bg-white/10'
                                                }`}
                                            title={isCollapsed ? item.label : ''}
                                        >
                                            <i className={`${item.icon} text-lg w-[24px] text-center shrink-0`} aria-hidden="true"></i>
                                            {!isCollapsed && (
                                                <span className="whitespace-nowrap">
                                                    {item.label}
                                                </span>
                                            )}
                                        </Link>
                                    )}

                                    {hasSub && isExpanded && !isCollapsed && (
                                        <div className="flex flex-col gap-1 lg:gap-2 my-1 lg:my-2 ml-10 relative">
                                            {(() => {
                                                const activeSubHref = item.subItems
                                                    .filter(s => url === s.href || url.startsWith(s.href + '/'))
                                                    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

                                                return item.subItems.map((sub, idx) => {
                                                    const subActive = sub.href === activeSubHref;
                                                    return (
                                                        <Link
                                                            key={idx}
                                                            to={sub.href}
                                                            className={`py-2 px-3 rounded-r-full text-[12.5px] font-[600] transition-all relative ${subActive
                                                                ? 'text-white font-[600] bg-white/20'
                                                                : 'text-white/70 hover:text-white hover:bg-white/5'
                                                                }`}
                                                        >
                                                            <span className={`absolute left-[-16px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-all ${subActive ? 'bg-white scale-100' : 'bg-white/50 scale-50'}`}></span>
                                                            {sub.label}
                                                        </Link>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </nav>

                <div className="mt-auto p-2 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-4 py-2 lg:py-3 px-3 rounded-full bg-white text-[#D10000] font-[600] text-[14px] transition-all duration-300 ${isCollapsed ? 'justify-center' : 'hover:bg-red-500 hover:text-white'}`}
                        title="Logout"
                    >
                        <i className="bi bi-box-arrow-right text-lg w-[24px] text-center shrink-0" aria-hidden="true"></i>
                        {!isCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </div>
        </aside>
    );
}
