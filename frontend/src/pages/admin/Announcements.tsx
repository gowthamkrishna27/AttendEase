import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageWrapper } from '../../components/layout/PageWrapper';
import {
  Megaphone, Plus, Search, Filter, Edit, Trash2, Eye,
  CheckCircle, XCircle, Clock, ExternalLink, Sparkles,
  Smartphone, Monitor, BarChart2, Check, AlertCircle, RefreshCw,
  Zap, Play, Palette, Type, Compass, Layout, Layers
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import type {
  AnnouncementAdminItem,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  AnnouncementType,
  AnnouncementMediaType,
  AnnouncementPlacement,
  AnnouncementState,
  AnnouncementDisplayMode,
} from '../../lib/api';
import { AnnouncementBanner } from '../../components/announcements/AnnouncementBanner';
import { AnnouncementWidget } from '../../components/announcements/AnnouncementWidget';
import { OpeningAnimation } from '../../components/announcements/OpeningAnimation';
import {
  TEXT_ANIMATION_OPTIONS,
  ANNOUNCEMENT_TEMPLATES,
  GRADIENT_THEMES,
  parseAnnouncementContent,
  serializeAnnouncementContent,
} from '../../components/announcements/announcementTemplates';
import type {
  TextAnimationType,
  TemplatePresetId,
  GradientThemeId,
  AnnouncementTemplatePreset,
} from '../../components/announcements/announcementTemplates';
import { AnimatedAnnouncementText } from '../../components/announcements/AnimatedAnnouncementText';

const initialFormData: CreateAnnouncementInput = {
  title: '',
  type: 'BANNER',
  mediaType: 'TEXT',
  state: 'ACTIVE',
  placement: 'HOME_TOP',
  srcUrl: '',
  externalUrl: '',
  content: '',
  buttonText: '',
  buttonUrl: '',
  openInNewTab: true,
  displayOrder: 0,
  priority: 0,
  targetRoles: ['student'],
  targetYears: [],
  targetDepartments: [],
  targetSections: [],
  startsAt: null,
  endsAt: null,
  displayMode: 'ONCE_PER_SESSION',
  closable: true,
  showCloseButton: true,
  autoCloseSeconds: null,
  backdropDismiss: true,
  height: 180,
  width: null,
  fullWidth: false,
};

export default function AdminAnnouncements() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'SCHEDULED' | 'DRAFT' | 'INACTIVE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [placementFilter, setPlacementFilter] = useState('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateAnnouncementInput>(initialFormData);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [activeFormTab, setActiveFormTab] = useState<'basic' | 'content' | 'targeting' | 'schedule' | 'layout'>('basic');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewModalItem, setPreviewModalItem] = useState<AnnouncementAdminItem | null>(null);

  // Animation & Template state
  const [rawTextContent, setRawTextContent] = useState('');
  const [selectedAnimation, setSelectedAnimation] = useState<TextAnimationType>('TYPEWRITER');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplatePresetId>('CUSTOM');
  const [badgeText, setBadgeText] = useState('📢 ANNOUNCEMENT');
  const [gradientTheme, setGradientTheme] = useState<GradientThemeId>('indigo_purple');
  const [animationSpeed, setAnimationSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [replayKey, setReplayKey] = useState(0);

  // Queries
  const { data: announcements = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-announcements', activeTab, typeFilter, placementFilter, searchTerm],
    queryFn: () =>
      api.getAdminAnnouncements({
        state: activeTab,
        type: typeFilter,
        placement: placementFilter,
        search: searchTerm,
      }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateAnnouncementInput) => api.createAnnouncement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      setIsModalOpen(false);
      setFormData(initialFormData);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAnnouncementInput }) =>
      api.updateAnnouncement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      setIsModalOpen(false);
      setEditingId(null);
      setFormData(initialFormData);
    },
  });

  const toggleStateMutation = useMutation({
    mutationFn: ({ id, state }: { id: string; state: AnnouncementState }) =>
      api.toggleAnnouncementState(id, state),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      setDeleteConfirmId(null);
    },
  });

  const syncSerializedContent = (
    text: string,
    anim: TextAnimationType,
    tpl: TemplatePresetId,
    bdg: string,
    theme: GradientThemeId,
    spd: 'slow' | 'normal' | 'fast'
  ) => {
    const serialized = serializeAnnouncementContent({
      text,
      animation: anim,
      template: tpl,
      badge: bdg,
      gradientTheme: theme,
      speed: spd,
    });
    setFormData((prev) => ({ ...prev, content: serialized }));
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setRawTextContent('');
    setSelectedAnimation('TYPEWRITER');
    setSelectedTemplate('CUSTOM');
    setBadgeText('📢 ANNOUNCEMENT');
    setGradientTheme('indigo_purple');
    setAnimationSpeed('normal');
    setReplayKey((k) => k + 1);

    const serialized = serializeAnnouncementContent({
      text: '',
      animation: 'TYPEWRITER',
      template: 'CUSTOM',
      badge: '📢 ANNOUNCEMENT',
      gradientTheme: 'indigo_purple',
      speed: 'normal',
    });

    setFormData({
      ...initialFormData,
      content: serialized,
    });
    setActiveFormTab('basic');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: AnnouncementAdminItem) => {
    setEditingId(item.id);
    const parsed = parseAnnouncementContent(item.content);
    setRawTextContent(parsed.text);
    setSelectedAnimation(parsed.animation);
    setSelectedTemplate(parsed.template);
    setBadgeText(parsed.badge || '📢 ANNOUNCEMENT');
    setGradientTheme(parsed.gradientTheme);
    setAnimationSpeed(parsed.speed);
    setReplayKey((k) => k + 1);

    setFormData({
      title: item.title,
      type: item.type,
      mediaType: item.mediaType,
      state: item.state,
      placement: item.placement,
      srcUrl: item.srcUrl || '',
      externalUrl: item.externalUrl || '',
      content: item.content || '',
      buttonText: item.buttonText || '',
      buttonUrl: item.buttonUrl || '',
      openInNewTab: item.openInNewTab,
      displayOrder: item.displayOrder,
      priority: item.priority,
      targetRoles: item.targetRoles || ['student'],
      targetYears: item.targetYears || [],
      targetDepartments: item.targetDepartments || [],
      targetSections: item.targetSections || [],
      startsAt: item.startsAt ? item.startsAt.slice(0, 16) : null,
      endsAt: item.endsAt ? item.endsAt.slice(0, 16) : null,
      displayMode: item.displayMode,
      closable: item.closable,
      showCloseButton: item.showCloseButton,
      autoCloseSeconds: item.autoCloseSeconds,
      backdropDismiss: item.backdropDismiss,
      height: item.height || 180,
      width: item.width,
      fullWidth: item.fullWidth,
    });
    setActiveFormTab('basic');
    setIsModalOpen(true);
  };

  const handleApplyTemplate = (template: AnnouncementTemplatePreset) => {
    setSelectedTemplate(template.id);
    setSelectedAnimation(template.animation);
    setBadgeText(template.badge);
    setGradientTheme(template.gradientTheme);
    setRawTextContent(template.defaultContent);
    setReplayKey((k) => k + 1);

    const serialized = serializeAnnouncementContent({
      text: template.defaultContent,
      animation: template.animation,
      template: template.id,
      badge: template.badge,
      gradientTheme: template.gradientTheme,
      speed: animationSpeed,
    });

    setFormData((prev) => ({
      ...prev,
      title: template.defaultTitle,
      mediaType: 'TEXT',
      content: serialized,
      buttonText: template.buttonText,
      buttonUrl: template.buttonUrl,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="w-3 h-3" />
            Scheduled
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Expired
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Inactive
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
            Draft
          </span>
        );
    }
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        
        {/* Top Header Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-indigo-950/40">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Text Animations, Announcement Templates & Dynamic Widgets</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Announcements & Widgets Studio
              </h1>
              <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                Publish high-impact announcement banners with 10 built-in text animations, interactive presets, external live widgets, and full opening popups.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => refetch()}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Announcement</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── READY-MADE TEMPLATES QUICK PICKER ── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Quick 1-Click Announcement Templates
              </h3>
            </div>
            <span className="text-[11.5px] font-medium text-slate-400">
              Click any template to auto-populate animations & styles
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ANNOUNCEMENT_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => {
                  handleOpenCreate();
                  handleApplyTemplate(tmpl);
                }}
                className="text-left group relative overflow-hidden p-3.5 rounded-2xl border border-slate-200 hover:border-orange-400 hover:shadow-md transition-all bg-gradient-to-br from-slate-50 to-white cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0 p-2 rounded-xl bg-white border border-slate-100 shadow-xs group-hover:scale-110 transition-transform">
                    {tmpl.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                        {tmpl.badge}
                      </span>
                      <span className="text-[10px] font-medium text-orange-600">
                        {tmpl.animation}
                      </span>
                    </div>
                    <h4 className="text-[13px] font-bold text-slate-900 truncate group-hover:text-orange-600 transition-colors">
                      {tmpl.name}
                    </h4>
                    <p className="text-[11.5px] text-slate-500 line-clamp-1 mt-0.5">
                      {tmpl.tagline}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(['ALL', 'ACTIVE', 'SCHEDULED', 'DRAFT', 'INACTIVE'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab === 'ALL' ? 'All Items' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search & Select Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search announcements..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 bg-slate-50/50"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 bg-white font-medium text-slate-700"
            >
              <option value="ALL">All Types</option>
              <option value="BANNER">Banner</option>
              <option value="WIDGET">Widget</option>
              <option value="OPENING_ANIMATION">Opening Animation</option>
            </select>

            <select
              value={placementFilter}
              onChange={(e) => setPlacementFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 bg-white font-medium text-slate-700"
            >
              <option value="ALL">All Placements</option>
              <option value="HOME_TOP">Home Top</option>
              <option value="HOME_MIDDLE">Home Middle</option>
              <option value="HOME_BOTTOM">Home Bottom</option>
              <option value="POPUP">Popup Modal</option>
            </select>
          </div>
        </div>

        {/* Table of Announcements */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-400 uppercase text-[10.5px] font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Announcement</th>
                  <th className="py-3.5 px-4">Type & Animation</th>
                  <th className="py-3.5 px-4">Placement</th>
                  <th className="py-3.5 px-4">Targeting</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Analytics</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading announcements...
                    </td>
                  </tr>
                ) : announcements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No announcements found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  announcements.map((item) => {
                    const parsed = parseAnnouncementContent(item.content);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 text-[13.5px] flex items-center gap-2">
                            {item.title}
                          </div>
                          <div className="text-[11.5px] text-slate-400 line-clamp-1 max-w-sm mt-0.5">
                            {parsed.text || item.srcUrl || 'No additional content'}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                              {item.type}
                            </span>
                            <span className="text-[10.5px] text-slate-400">
                              {item.mediaType === 'TEXT' && parsed.isAnimated
                                ? `✨ ${parsed.animation}`
                                : item.mediaType}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-medium text-slate-600 text-[11px]">
                            {item.placement}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {item.targetRoles && item.targetRoles.length > 0 ? (
                              item.targetRoles.map((r) => (
                                <span
                                  key={r}
                                  className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10.5px] font-semibold capitalize"
                                >
                                  {r}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 text-[11px]">All Roles</span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {getStatusBadge(item.computedStatus || item.state)}
                        </td>

                        <td className="py-4 px-4">
                          {item.analytics ? (
                            <div className="text-[11px] text-slate-600 space-y-0.5">
                              <div><span className="font-bold">{item.analytics.viewsCount}</span> views</div>
                              <div><span className="font-bold">{item.analytics.clicksCount}</span> clicks ({item.analytics.ctr}%)</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Preview */}
                            <button
                              type="button"
                              onClick={() => setPreviewModalItem(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Preview Announcement"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Toggle State */}
                            <button
                              type="button"
                              onClick={() =>
                                toggleStateMutation.mutate({
                                  id: item.id,
                                  state: item.state === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                                })
                              }
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                item.state === 'ACTIVE'
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={item.state === 'ACTIVE' ? 'Set Inactive' : 'Set Active'}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
            >
              
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                    {editingId ? 'Edit Announcement' : 'Create Animated Announcement'}
                  </h2>
                  <p className="text-[12.5px] text-slate-500">
                    Configure text animation styles, presentation templates, targeting, and schedule.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Tab Navigation in Form */}
              <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 bg-white overflow-x-auto">
                {[
                  { id: 'basic', label: '1. Basic Info & Templates' },
                  { id: 'content', label: '2. Text & Built-in Animations' },
                  { id: 'targeting', label: '3. Targeting' },
                  { id: 'schedule', label: '4. Schedule & Frequency' },
                  { id: 'layout', label: '5. Layout & Dimensions' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveFormTab(t.id as any)}
                    className={`pb-2.5 px-3 text-[13px] font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeFormTab === t.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                
                {/* ── TAB 1: BASIC INFO & TEMPLATES ── */}
                {activeFormTab === 'basic' && (
                  <div className="space-y-5">
                    
                    {/* Preset Template Selector */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[12.5px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-orange-500" />
                          Apply Ready-Made Template Preset (Optional)
                        </label>
                        <span className="text-[11px] text-slate-400">Click to fill content & animations</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {ANNOUNCEMENT_TEMPLATES.map((tmpl) => (
                          <button
                            key={tmpl.id}
                            type="button"
                            onClick={() => handleApplyTemplate(tmpl)}
                            className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                              selectedTemplate === tmpl.id
                                ? 'border-orange-500 bg-orange-50/50 shadow-xs'
                                : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">{tmpl.icon}</span>
                              <span className="text-[12px] font-bold text-slate-900 truncate">
                                {tmpl.name.split('&')[0]}
                              </span>
                            </div>
                            <div className="text-[10px] font-semibold text-orange-600">
                              {tmpl.animation}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12.5px] font-bold text-slate-700 mb-1">
                        Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Semester Exam Timetable Released, HPL Live Match..."
                        className="w-full px-3.5 py-2 text-[13.5px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[12.5px] font-bold text-slate-700 mb-1">Type</label>
                        <select
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value as AnnouncementType })}
                          className="w-full px-3 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 bg-white font-medium text-slate-800"
                        >
                          <option value="BANNER">Banner (Top / Middle / Bottom)</option>
                          <option value="WIDGET">Interactive Widget Card</option>
                          <option value="OPENING_ANIMATION">Popup Opening Modal</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[12.5px] font-bold text-slate-700 mb-1">Media Type</label>
                        <select
                          value={formData.mediaType}
                          onChange={(e) => setFormData({ ...formData, mediaType: e.target.value as AnnouncementMediaType })}
                          className="w-full px-3 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 bg-white font-medium text-slate-800"
                        >
                          <option value="TEXT">✨ Text with Built-in Animations</option>
                          <option value="IFRAME">🌐 Iframe embed (Live Stream / Match)</option>
                          <option value="IMAGE">🖼️ Image Banner</option>
                          <option value="VIDEO">🎬 Video Player</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[12.5px] font-bold text-slate-700 mb-1">Placement</label>
                        <select
                          value={formData.placement}
                          onChange={(e) => setFormData({ ...formData, placement: e.target.value as AnnouncementPlacement })}
                          className="w-full px-3 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 bg-white font-medium text-slate-800"
                        >
                          <option value="HOME_TOP">Home Top</option>
                          <option value="HOME_MIDDLE">Home Middle</option>
                          <option value="HOME_BOTTOM">Home Bottom</option>
                          <option value="POPUP">Popup Modal</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12.5px] font-bold text-slate-700 mb-1">Status State</label>
                      <div className="flex items-center gap-4">
                        {(['ACTIVE', 'DRAFT', 'INACTIVE'] as const).map((st) => (
                          <label key={st} className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700 cursor-pointer">
                            <input
                              type="radio"
                              name="state"
                              value={st}
                              checked={formData.state === st}
                              onChange={() => setFormData({ ...formData, state: st })}
                              className="text-orange-600 focus:ring-orange-500"
                            />
                            {st.charAt(0) + st.slice(1).toLowerCase()}
                          </label>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

                {/* ── TAB 2: TEXT & BUILT-IN ANIMATIONS / SOURCE ── */}
                {activeFormTab === 'content' && (
                  <div className="space-y-5">
                    
                    {formData.mediaType === 'TEXT' ? (
                      <div className="space-y-5">
                        
                        {/* Text input */}
                        <div>
                          <label className="block text-[12.5px] font-bold text-slate-700 mb-1">
                            Announcement Text / Message <span className="text-rose-500">*</span>
                          </label>
                          <textarea
                            rows={3}
                            value={rawTextContent}
                            onChange={(e) => {
                              setRawTextContent(e.target.value);
                              syncSerializedContent(
                                e.target.value,
                                selectedAnimation,
                                selectedTemplate,
                                badgeText,
                                gradientTheme,
                                animationSpeed
                              );
                            }}
                            placeholder="Enter the announcement message to animate..."
                            className="w-full px-3.5 py-2.5 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 leading-relaxed font-sans"
                          />
                        </div>

                        {/* Built-in Animation Gallery */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-[12.5px] font-bold text-slate-700 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-orange-500" />
                              Select Built-in Text Animation Style
                            </label>
                            <span className="text-[11px] text-slate-400">10 High-impact animation presets</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1 bg-slate-50/60 rounded-2xl border border-slate-100">
                            {TEXT_ANIMATION_OPTIONS.map((opt) => {
                              const isSelected = selectedAnimation === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedAnimation(opt.id);
                                    setReplayKey((k) => k + 1);
                                    syncSerializedContent(
                                      rawTextContent,
                                      opt.id,
                                      selectedTemplate,
                                      badgeText,
                                      gradientTheme,
                                      animationSpeed
                                    );
                                  }}
                                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex items-start gap-2.5 ${
                                    isSelected
                                      ? 'border-orange-500 bg-white ring-2 ring-orange-500/20 shadow-xs'
                                      : 'border-slate-200/80 bg-white hover:border-slate-300'
                                  }`}
                                >
                                  <span className="text-xl shrink-0 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                                    {opt.icon}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                      <h4 className={`text-[12px] font-bold truncate ${isSelected ? 'text-orange-600' : 'text-slate-900'}`}>
                                        {opt.label}
                                      </h4>
                                      <span className="text-[9.5px] font-semibold uppercase px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500">
                                        {opt.category}
                                      </span>
                                    </div>
                                    <p className="text-[10.5px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                                      {opt.description}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Badge, Theme & Speed Customization */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                          
                          <div>
                            <label className="block text-[12px] font-bold text-slate-700 mb-1">Badge Text</label>
                            <input
                              type="text"
                              value={badgeText}
                              onChange={(e) => {
                                setBadgeText(e.target.value);
                                syncSerializedContent(
                                  rawTextContent,
                                  selectedAnimation,
                                  selectedTemplate,
                                  e.target.value,
                                  gradientTheme,
                                  animationSpeed
                                );
                              }}
                              placeholder="e.g. ⚠️ URGENT, 🔴 LIVE, 🏆 WINNER"
                              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[12px] font-bold text-slate-700 mb-1">Color Palette Theme</label>
                            <select
                              value={gradientTheme}
                              onChange={(e) => {
                                const themeVal = e.target.value as GradientThemeId;
                                setGradientTheme(themeVal);
                                syncSerializedContent(
                                  rawTextContent,
                                  selectedAnimation,
                                  selectedTemplate,
                                  badgeText,
                                  themeVal,
                                  animationSpeed
                                );
                              }}
                              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 bg-white font-medium text-slate-800"
                            >
                              {Object.entries(GRADIENT_THEMES).map(([id, t]) => (
                                <option key={id} value={id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[12px] font-bold text-slate-700 mb-1">Animation Speed</label>
                            <select
                              value={animationSpeed}
                              onChange={(e) => {
                                const spd = e.target.value as 'slow' | 'normal' | 'fast';
                                setAnimationSpeed(spd);
                                setReplayKey((k) => k + 1);
                                syncSerializedContent(
                                  rawTextContent,
                                  selectedAnimation,
                                  selectedTemplate,
                                  badgeText,
                                  gradientTheme,
                                  spd
                                );
                              }}
                              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 bg-white font-medium text-slate-800"
                            >
                              <option value="slow">Slow & Gentle</option>
                              <option value="normal">Normal Speed</option>
                              <option value="fast">Fast & Energetic</option>
                            </select>
                          </div>

                        </div>

                        {/* ── LIVE INTERACTIVE ANIMATION PREVIEW CARD ── */}
                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-[12.5px] font-bold text-slate-700 flex items-center gap-1.5">
                              <Eye className="w-4 h-4 text-emerald-600" />
                              Live Real-Time Text Animation Preview
                            </label>
                            <button
                              type="button"
                              onClick={() => setReplayKey((k) => k + 1)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11.5px] font-semibold transition-colors cursor-pointer"
                            >
                              <Play className="w-3 h-3 text-orange-500" />
                              <span>Replay Animation</span>
                            </button>
                          </div>

                          <div className={`p-4 rounded-2xl bg-gradient-to-r ${GRADIENT_THEMES[gradientTheme].backgroundGradient} border border-white/10 shadow-lg text-white`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${GRADIENT_THEMES[gradientTheme].badgeStyle}`}>
                                {badgeText || 'Announcement'}
                              </span>
                              <span className="text-[13.5px] font-bold text-white">
                                {formData.title || 'Announcement Title'}
                              </span>
                            </div>
                            <div className="text-[13px] leading-relaxed text-slate-200/90 min-h-[32px] flex items-center">
                              {rawTextContent.trim() ? (
                                <AnimatedAnnouncementText
                                  text={rawTextContent}
                                  animation={selectedAnimation}
                                  gradientTheme={gradientTheme}
                                  speed={animationSpeed}
                                  replayKey={replayKey}
                                />
                              ) : (
                                <span className="text-slate-400 italic text-xs">
                                  Type text above to preview live animation...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                    ) : (
                      /* Media Type is IFRAME / IMAGE / VIDEO */
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[12.5px] font-bold text-slate-700 mb-1">
                            Source URL (for Iframe, Video, or Image)
                          </label>
                          <input
                            type="url"
                            value={formData.srcUrl || ''}
                            onChange={(e) => setFormData({ ...formData, srcUrl: e.target.value })}
                            placeholder="https://csdcsitcricket.up.railway.app/widget/live"
                            className="w-full px-3.5 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                          />
                          <p className="text-[11.5px] text-slate-400 mt-1">
                            HTTPS required for external links.
                          </p>
                        </div>

                        <div>
                          <label className="block text-[12.5px] font-bold text-slate-700 mb-1">
                            External / Full Center URL (Optional)
                          </label>
                          <input
                            type="url"
                            value={formData.externalUrl || ''}
                            onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                            placeholder="https://csdcsitcricket.up.railway.app"
                            className="w-full px-3.5 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* CTA Button Settings */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[12.5px] font-bold text-slate-700 mb-1">Button Text (CTA)</label>
                          <input
                            type="text"
                            value={formData.buttonText || ''}
                            onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                            placeholder="e.g. View Schedule, Watch Live, Register Now"
                            className="w-full px-3.5 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[12.5px] font-bold text-slate-700 mb-1">Button Destination URL</label>
                          <input
                            type="text"
                            value={formData.buttonUrl || ''}
                            onChange={(e) => setFormData({ ...formData, buttonUrl: e.target.value })}
                            placeholder="https://... or /student/history"
                            className="w-full px-3.5 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>

                      <label className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700 cursor-pointer pt-3">
                        <input
                          type="checkbox"
                          checked={formData.openInNewTab}
                          onChange={(e) => setFormData({ ...formData, openInNewTab: e.target.checked })}
                          className="rounded text-orange-600 focus:ring-orange-500"
                        />
                        Open CTA links in new tab
                      </label>
                    </div>

                  </div>
                )}

                {/* ── TAB 3: TARGETING ── */}
                {activeFormTab === 'targeting' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[12.5px] font-bold text-slate-700 mb-1">Target Roles</label>
                      <div className="flex flex-wrap gap-3">
                        {['student', 'faculty', 'hod', 'admin'].map((role) => {
                          const checked = formData.targetRoles?.includes(role) ?? false;
                          return (
                            <label key={role} className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const cur = formData.targetRoles || [];
                                  const updated = e.target.checked
                                    ? [...cur, role]
                                    : cur.filter((r) => r !== role);
                                  setFormData({ ...formData, targetRoles: updated });
                                }}
                                className="rounded text-orange-600 focus:ring-orange-500"
                              />
                              <span className="capitalize">{role}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12.5px] font-bold text-slate-700 mb-1">
                        Target Departments (comma-separated, leave empty for all)
                      </label>
                      <input
                        type="text"
                        value={formData.targetDepartments?.join(', ') || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            targetDepartments: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        placeholder="e.g. CSIT, CSD, ECE"
                        className="w-full px-3.5 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12.5px] font-bold text-slate-700 mb-1">
                          Target Years (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={formData.targetYears?.join(', ') || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              targetYears: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                            })
                          }
                          placeholder="e.g. 1st Year, 2nd Year, 3rd Year"
                          className="w-full px-3.5 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[12.5px] font-bold text-slate-700 mb-1">
                          Target Sections (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={formData.targetSections?.join(', ') || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              targetSections: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                            })
                          }
                          placeholder="e.g. CSIT-A, CSIT-B"
                          className="w-full px-3.5 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 4: SCHEDULE & FREQUENCY ── */}
                {activeFormTab === 'schedule' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12.5px] font-bold text-slate-700 mb-1">Start Date / Time</label>
                        <input
                          type="datetime-local"
                          value={formData.startsAt || ''}
                          onChange={(e) => setFormData({ ...formData, startsAt: e.target.value || null })}
                          className="w-full px-3.5 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[12.5px] font-bold text-slate-700 mb-1">End Date / Time</label>
                        <input
                          type="datetime-local"
                          value={formData.endsAt || ''}
                          onChange={(e) => setFormData({ ...formData, endsAt: e.target.value || null })}
                          className="w-full px-3.5 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12.5px] font-bold text-slate-700 mb-1">Display Frequency</label>
                      <select
                        value={formData.displayMode}
                        onChange={(e) => setFormData({ ...formData, displayMode: e.target.value as AnnouncementDisplayMode })}
                        className="w-full px-3 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 bg-white"
                      >
                        <option value="EVERY_PAGE_LOAD">Every page load</option>
                        <option value="ONCE_PER_SESSION">Once per session</option>
                        <option value="ONCE_PER_DAY">Once per day</option>
                        <option value="ONCE_PER_LOGIN">Once per login</option>
                        <option value="ONCE_PER_USER">Once per user (server tracked)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-[12.5px] font-bold text-slate-700 mb-1">Auto-close (seconds)</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.autoCloseSeconds || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              autoCloseSeconds: e.target.value ? parseInt(e.target.value, 10) : null,
                            })
                          }
                          placeholder="e.g. 5 for 5 seconds countdown"
                          className="w-full px-3.5 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="flex flex-col justify-end space-y-2">
                        <label className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.closable}
                            onChange={(e) => setFormData({ ...formData, closable: e.target.checked })}
                            className="rounded text-orange-600 focus:ring-orange-500"
                          />
                          Allow user to close / dismiss
                        </label>

                        <label className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.backdropDismiss}
                            onChange={(e) => setFormData({ ...formData, backdropDismiss: e.target.checked })}
                            className="rounded text-orange-600 focus:ring-orange-500"
                          />
                          Close on backdrop click
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 5: LAYOUT & DIMENSIONS ── */}
                {activeFormTab === 'layout' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12.5px] font-bold text-slate-700 mb-1">Height (px)</label>
                        <input
                          type="number"
                          value={formData.height || 180}
                          onChange={(e) =>
                            setFormData({ ...formData, height: e.target.value ? parseInt(e.target.value, 10) : null })
                          }
                          className="w-full px-3.5 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[12.5px] font-bold text-slate-700 mb-1">Width (px, optional)</label>
                        <input
                          type="number"
                          value={formData.width || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, width: e.target.value ? parseInt(e.target.value, 10) : null })
                          }
                          placeholder="Leave empty for auto width"
                          className="w-full px-3.5 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12.5px] font-bold text-slate-700 mb-1">Display Priority (Higher = Top)</label>
                        <input
                          type="number"
                          value={formData.priority}
                          onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value, 10) || 0 })}
                          className="w-full px-3.5 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[12.5px] font-bold text-slate-700 mb-1">Display Order</label>
                        <input
                          type="number"
                          value={formData.displayOrder}
                          onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value, 10) || 0 })}
                          className="w-full px-3.5 py-2 text-[13px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={formData.fullWidth}
                        onChange={(e) => setFormData({ ...formData, fullWidth: e.target.checked })}
                        className="rounded text-orange-600 focus:ring-orange-500"
                      />
                      Span full container width
                    </label>
                  </div>
                )}

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-5 py-2 rounded-xl text-[13px] font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {editingId ? 'Save Changes' : 'Publish Announcement'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── LIVE PREVIEW MODAL ── */}
      <AnimatePresence>
        {previewModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900 text-sm">Live Preview</span>
                  <div className="flex items-center p-0.5 bg-slate-200/80 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewViewport('desktop')}
                      className={`p-1.5 rounded-md flex items-center gap-1 ${
                        previewViewport === 'desktop' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport('mobile')}
                      className={`p-1.5 rounded-md flex items-center gap-1 ${
                        previewViewport === 'mobile' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Mobile</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewModalItem(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex items-center justify-center">
                <div
                  className={`transition-all duration-300 bg-white p-4 rounded-2xl shadow-sm ${
                    previewViewport === 'mobile' ? 'w-[375px]' : 'w-full'
                  }`}
                >
                  {previewModalItem.type === 'BANNER' && (
                    <AnnouncementBanner announcement={previewModalItem} />
                  )}
                  {previewModalItem.type === 'WIDGET' && (
                    <AnnouncementWidget announcement={previewModalItem} />
                  )}
                  {previewModalItem.type === 'OPENING_ANIMATION' && (
                    <div className="p-4 text-center">
                      <p className="text-xs text-slate-500 mb-3">Opening animation renders as full modal dialog on user login/open.</p>
                      <OpeningAnimation announcement={previewModalItem} onDismiss={() => setPreviewModalItem(null)} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Delete Announcement?</h3>
              <p className="text-[13px] text-slate-500 mb-6">
                This action cannot be undone. Any active views or analytics will be removed.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(deleteConfirmId)}
                  className="px-5 py-2 rounded-xl text-[13px] font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </PageWrapper>
  );
}
