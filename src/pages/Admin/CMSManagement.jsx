import React, { useState, useRef } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Button, Input, InputWrapper, Label, Badge, Select, ImageModal, useToast } from '@/components/UI';

export default function CMSManagement() {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('legal'); // 'legal', 'faqs', 'banners', 'about'
    const [pageTitle, setPageTitle] = useState('Terms & Conditions');
    const fileInputRef = useRef(null);
    const [bannerPreview, setBannerPreview] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedBanner, setSelectedBanner] = useState(null);

    const tabs = [
        { id: 'legal', label: 'Legal Policies', icon: 'bi bi-shield-lock' },
        { id: 'faqs', label: "FAQ's", icon: 'bi bi-question-circle' },
        { id: 'banners', label: 'App Banners', icon: 'bi bi-images' },
        { id: 'about', label: 'About Us', icon: 'bi bi-info-square' }
    ];

    const faqs = [
        { id: 1, question: 'How do I request a ride?', category: 'Passenger', status: 'Published' },
        { id: 2, question: 'What are the payment methods?', category: 'Payments', status: 'Published' },
        { id: 3, question: 'How to become a driver?', category: 'Drivers', status: 'Draft' },
    ];

    const banners = [
        { id: 1, title: 'Summer Promotion', image: 'https://picsum.photos/800/400?random=1', status: 'Active' },
        { id: 2, title: 'New Driver Bonus', image: 'https://picsum.photos/800/400?random=2', status: 'Active' },
        { id: 3, title: 'referral Program', image: 'https://picsum.photos/800/400?random=3', status: 'Inactive' },
    ];

    const handleBannerClick = (url) => {
        setSelectedBanner(url);
        setIsPreviewOpen(true);
    };

    return (
        <AdminLayout title="CMS Management">
            {/* Category Tabs */}
            <div className="mb-4">
                <div className="flex bg-white border border-[#E5E7EB] rounded-full p-1 shadow-sm overflow-x-auto no-scrollbar max-w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-8 py-3.5 text-[14px] font-[700] rounded-full transition-all duration-300 flex items-center gap-3 whitespace-nowrap ${activeTab === tab.id ? 'bg-[#D10000] text-white shadow-lg shadow-red-100' : 'text-gray-500 hover:text-[#111]'}`}
                        >
                            <i className={`${tab.icon} text-lg`}></i>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="animate-fade-in">
                {activeTab === 'legal' && (
                    <div className=" space-y-6">
                        <div className="bg-white border border-gray-200 rounded-[30px] p-6 shadow-sm">
                            <div className="bg-[#d10000]  rounded-full  p-4 text-[14px] font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <i className="bi bi-pencil-square"></i> Edit Policy Content
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 px-4">
                                <div className="space-y-2 px-2">
                                    <Label>Select Policy</Label>
                                    <InputWrapper>
                                        <Select value={pageTitle} onChange={(e) => setPageTitle(e.target.value)}>
                                            <option>Terms & Conditions</option>
                                            <option>Privacy Policy</option>
                                            <option>Refund Policy</option>
                                        </Select>
                                        <i className="bi bi-chevron-down text-gray-400 text-xs"></i>
                                    </InputWrapper>
                                </div>
                                <div className="space-y-2 px-2">
                                    <Label>Page Display Title</Label>
                                    <InputWrapper>
                                        <Input value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} />
                                    </InputWrapper>
                                </div>
                            </div>

                            <div className="border border-gray-100 rounded-[24px]  overflow-hidden shadow-inner bg-gray-50/30">
                                <div className="bg-white p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
                                    <div className="flex gap-1 pr-4 border-r border-gray-100">
                                        {['B', 'I', 'U'].map(btn => (
                                            <button key={btn} className="w-10 h-10 rounded-xl hover:bg-gray-50 flex items-center justify-center font-bold text-gray-600 transition-all">{btn}</button>
                                        ))}
                                    </div>
                                    <div className="flex gap-1 pr-4 border-r border-gray-100">
                                        <button className="w-10 h-10 rounded-xl hover:bg-gray-50 flex items-center justify-center text-gray-600"><i className="bi bi-list-ul"></i></button>
                                        <button className="w-10 h-10 rounded-xl hover:bg-gray-50 flex items-center justify-center text-gray-600"><i className="bi bi-list-ol"></i></button>
                                    </div>
                                    <button className="text-[13px] font-[800] text-[#D10000] ml-auto uppercase italic tracking-widest px-4">
                                        <i className="bi bi-code-slash mr-2"></i> View Source
                                    </button>
                                </div>
                                <div className="p-4 min-h-[200px] bg-white outline-none prose prose-red max-w-none text-[15px] leading-relaxed text-gray-600 font-[500]" contentEditable>
                                    <h2 className="text-[#111] font-[800]">Overview</h2>
                                    <p>Welcome to Riden. These terms and conditions outline the rules and regulations for the use of our services...</p>
                                    <p>By accessing this service we assume you accept these terms and conditions. Do not continue to use Riden if you do not agree to take all of the terms and conditions stated on this page.</p>
                                </div>
                            </div>

                            <div className=" flex justify-end gap-3 px-2">
                                <Button variant="outline" className="px-10 py-3.5 border-black text-black font-[800] rounded-2xl uppercase text-sm" onClick={() => showToast("Changes discarded", "info")}>Discard</Button>
                                <Button className="px-10 py-3.5 bg-[#D10000] text-white font-[800] rounded-2xl shadow-xl shadow-red-100 italic uppercase text-sm" onClick={() => showToast("Policy updated successfully!", "success")}>Save Changes</Button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'faqs' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center px-4">
                            <h3 className="text-xl font-[800] text-[#111]">Manage FAQ's</h3>
                            <Button variant="pill" className="px-6"><i className="bi bi-plus-lg mr-2"></i> Add FAQ</Button>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-[30px] overflow-hidden shadow-sm">
                            <table className="w-full text-center">
                                <thead className="bg-[#FFF1F2]">
                                    <tr>
                                        <th className="py-5 px-6 text-[14px] font-[800] text-[#D10000] uppercase tracking-wider">Question</th>
                                        <th className="py-5 px-6 text-[14px] font-[800] text-[#D10000] uppercase tracking-wider">Category</th>
                                        <th className="py-5 px-6 text-[14px] font-[800] text-[#D10000] uppercase tracking-wider">Status</th>
                                        <th className="py-5 px-6 text-[14px] font-[800] text-[#D10000] uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {faqs.map((faq) => (
                                        <tr key={faq.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="py-5 px-6 text-[15px] font-[700] text-[#111]">{faq.question}</td>
                                            <td className="py-5 px-6 text-[15px] font-[600] text-gray-500">{faq.category}</td>
                                            <td className="py-5 px-6">
                                                <Badge variant={faq.status === 'Published' ? 'active' : 'pending'}>{faq.status}</Badge>
                                            </td>
                                            <td className="py-5 px-6">
                                                <button className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-[#D10000] hover:text-white transition-all"><i className="bi bi-pencil-fill text-sm"></i></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'banners' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex justify-between items-center px-4">
                            <h3 className="text-xl font-[800] text-[#111]">Promotional Banners</h3>
                            <Button variant="pill" className="px-8" onClick={() => fileInputRef.current.click()}>
                                <i className="bi bi-cloud-arrow-up-fill mr-2"></i> Upload New Banner
                            </Button>
                            <input type="file" ref={fileInputRef} className="hidden" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {banners.map((banner) => (
                                <div key={banner.id} className="bg-white border border-gray-200 rounded-[30px] overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                                    <div className="relative h-48 overflow-hidden cursor-pointer" onClick={() => handleBannerClick(banner.image)}>
                                        <img src={banner.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={banner.title} />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <i className="bi bi-eye text-white text-3xl"></i>
                                        </div>
                                        <div className="absolute top-4 right-4">
                                            <Badge variant={banner.status === 'Active' ? 'active' : 'inactive'}>{banner.status}</Badge>
                                        </div>
                                    </div>
                                    <div className="p-6 flex justify-between items-center">
                                        <h4 className="font-[800] text-[#111] text-lg">{banner.title}</h4>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => showToast(`${banner.title} has been deleted`, "delete")}
                                                className="w-10 h-10 rounded-2xl bg-gray-50 text-gray-400 hover:text-[#D10000] transition-colors shadow-sm flex items-center justify-center"
                                            >
                                                <i className="bi bi-trash3-fill"></i>
                                            </button>
                                            <button className="w-10 h-10 rounded-2xl bg-gray-50 text-gray-400 hover:text-black transition-colors shadow-sm flex items-center justify-center"><i className="bi bi-gear-fill"></i></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'about' && (
                    <div className=" space-y-6">
                        <div className="bg-white border border-gray-200 rounded-[30px] p-10 shadow-sm text-center">
                            <div className="w-24 h-24 bg-[#D10000]/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i className="bi bi-buildings text-[40px] text-[#D10000]"></i>
                            </div>
                            <h3 className="text-2xl font-[800] text-[#111] mb-2 tracking-tight">About Riden Platform</h3>
                            <p className="text-gray-500 font-[500] mb-10 max-w-lg mx-auto">Manage your platform identity, mission statement, and version history across all user-facing applications.</p>

                            <div className="space-y-6 text-left max-w-2xl mx-auto">
                                <div className="space-y-2">
                                    <Label>Our Mission</Label>
                                    <textarea className="w-full min-h-[120px] p-6 rounded-[24px] border border-gray-200 outline-none focus:border-[#D10000] text-gray-600 font-[500] text-[15px] resize-none" defaultValue="Providing the most reliable and safest transportation experience in the city..."></textarea>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Platform Version</Label>
                                        <Input defaultValue="v2.4.0 (Enterprise)" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Copyright Year</Label>
                                        <Input defaultValue="2025" />
                                    </div>
                                </div>
                                <div className="pt-6">
                                    <Button
                                        onClick={() => showToast("Corporate information updated", "update")}
                                        className="w-full py-4 tracking-widest font-black uppercase italic shadow-xl shadow-red-500/10"
                                    >
                                        Update Corporate Information
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ImageModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} imageUrl={selectedBanner} />
        </AdminLayout>
    );
}
