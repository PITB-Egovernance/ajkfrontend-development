import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from 'Components/ui/Card';
import { 
  Building2, 
  Network, 
  MapPin, 
  Map,
  Settings2,
  ChevronRight,
  Briefcase,
  Award,
  Building,
  Users
} from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();

  const settingsModules = [
    {
      icon: Building2,
      title: 'Organization Information',
      description: 'Manage organizational profile, leadership details, and contact information',
      color: 'emerald',
      bgGradient: 'from-emerald-50 to-teal-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      link: '/dashboard/settings/organization'
    },
    {
      icon: Network,
      title: 'Organizational Hierarchy',
      description: 'Configure departments, wings, sections and their hierarchical structure',
      color: 'blue',
      bgGradient: 'from-blue-50 to-indigo-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      link: '/dashboard/settings/hierarchy'
    },
    {
      icon: MapPin,
      title: 'Districts Management',
      description: 'Add and manage district master data with codes and status',
      color: 'amber',
      bgGradient: 'from-amber-50 to-orange-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-200',
      link: '/dashboard/settings/districts'
    },
    {
      icon: Map,
      title: 'Tehsils Management',
      description: 'Manage tehsil data and associate them with their parent districts',
      color: 'purple',
      bgGradient: 'from-purple-50 to-pink-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200',
      link: '/dashboard/settings/tehsils'
    },
    {
      icon: Briefcase,
      title: 'Designations Management',
      description: 'Manage designation titles, types and BPS grade assignments',
      color: 'indigo',
      bgGradient: 'from-indigo-50 to-blue-50',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
      link: '/dashboard/settings/designations'
    },
    {
      icon: Award,
      title: 'Grades Management',
      description: 'Configure BPS grade scales and pay structure hierarchy',
      color: 'cyan',
      bgGradient: 'from-cyan-50 to-blue-50',
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      borderColor: 'border-cyan-200',
      link: '/dashboard/settings/grades'
    },
    {
      icon: Building,
      title: 'Companies Management',
      description: 'Manage vendor companies, contractors, and service providers',
      color: 'teal',
      bgGradient: 'from-teal-50 to-cyan-50',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      borderColor: 'border-teal-200',
      link: '/dashboard/settings/companies'
    },
    {
      icon: Users,
      title: 'Individual Contractors',
      description: 'Add and manage individual freelance contractors and specialists',
      color: 'violet',
      bgGradient: 'from-violet-50 to-purple-50',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      borderColor: 'border-violet-200',
      link: '/dashboard/settings/contractors'
    }
  ];

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <Settings2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">System Settings</h1>
              <p className="text-slate-600 mt-1">Configure fundamental aspects of the system</p>
            </div>
          </div>
        </motion.div>

        {/* Settings Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsModules.map((module, index) => (
            <motion.div
              key={module.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 ${module.borderColor} bg-gradient-to-br ${module.bgGradient}`}
                onClick={() => navigate(module.link)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`${module.iconBg} p-4 rounded-xl shadow-sm`}>
                        <module.icon className={`w-8 h-8 ${module.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                          {module.title}
                        </h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                          {module.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-slate-400 flex-shrink-0 mt-2" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Additional Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >

        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
