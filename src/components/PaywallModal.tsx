import React from 'react';
import { Icon } from './Icon';

interface PaywallModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const features = [
        {
            title: 'Unlimited AI Generations',
            description: 'Generate as many creatives as you need without limits.',
            icon: 'auto_awesome'
        },
        {
            title: 'Advanced Analytics',
            description: 'Get deep insights into your creative performance and trends.',
            icon: 'insights'
        },
        {
            title: 'Premium Templates',
            description: 'Access exclusive, high-converting design templates.',
            icon: 'diamond'
        },
        {
            title: 'Priority Support',
            description: 'Get help faster with our dedicated support team.',
            icon: 'support_agent'
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
                >
                    <Icon name="close" size={24} />
                </button>

                {/* Header Section */}
                <div className="text-center pt-8 pb-6 px-8 relative">
                    <div className="flex items-center justify-center gap-2 mb-6 bg-gray-50 py-1.5 px-3 rounded-full w-fit mx-auto border border-gray-100">
                        <div className="flex -space-x-2">
                            <div className="size-5 rounded-full bg-gray-200 border-2 border-white" />
                            <div className="size-5 rounded-full bg-gray-300 border-2 border-white" />
                            <div className="size-5 rounded-full bg-gray-400 border-2 border-white" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Trusted by 500+ agencies</span>
                    </div>

                    <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2 leading-tight">Scale Your Content Production</h2>
                    <p className="text-gray-500 font-medium max-w-sm mx-auto">Join the top 1% of creators who use Proveen to automate their workflow.</p>
                </div>

                {/* Features List */}
                <div className="px-8 pb-6">
                    <div className="space-y-3">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className={`flex items-start gap-4 p-3 rounded-xl transition-all ${index === 0
                                        ? 'bg-black text-white shadow-lg scale-[1.02] border-none'
                                        : 'hover:bg-gray-50 border border-transparent'
                                    }`}
                            >
                                <div className={`p-2 rounded-lg shrink-0 ${index === 0 ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}`}>
                                    <Icon name={feature.icon} size={20} />
                                </div>
                                <div>
                                    <h3 className={`font-bold text-sm ${index === 0 ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                                    <p className={`text-xs mt-0.5 leading-relaxed ${index === 0 ? 'text-gray-300' : 'text-gray-500'}`}>{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pricing & CTA */}
                <div className="p-8 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-end justify-center gap-1 mb-6">
                        <span className="text-4xl font-black text-gray-900">$29</span>
                        <span className="text-gray-500 font-medium mb-1">/month</span>
                    </div>

                    <button className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-800 transform transition-all active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group">
                        <span>Upgrade Now</span>
                        <Icon name="arrow_forward" size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>

                    <p className="text-center mt-4 text-xs font-medium text-gray-400 flex items-center justify-center gap-1">
                        <Icon name="check" size={12} /> Cancel anytime. No questions asked.
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full mt-3 py-2 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaywallModal;
