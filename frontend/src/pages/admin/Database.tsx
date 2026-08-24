import { useState, useEffect } from 'react';
import {
  Database, Search, RefreshCw, Download, ChevronLeft,
  ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Eye, Copy,
  Check, FileSpreadsheet, X, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Modal } from '../../components/shared/Modal';
import * as api from '../../lib/api';
import type { DBTableOverview, DBTableDataResponse } from '../../lib/api';

export default function AdminDatabase() {
  const [overview, setOverview] = useState<DBTableOverview[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string>('User');

  // Table Data State
  const [tableData, setTableData] = useState<DBTableDataResponse | null>(null);
  const [loadingTable, setLoadingTable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Advanced Filter panel state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterColumn, setFilterColumn] = useState('all');
  const [filterValue, setFilterValue] = useState('');

  // Row inspection modal
  const [inspectingRow, setInspectingRow] = useState<Record<string, any> | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Overview on mount
  const fetchOverview = async () => {
    try {
      setLoadingOverview(true);
      const res = await api.getDatabaseOverview();
      if (res.tables) {
        setOverview(res.tables);
      }
    } catch (err: any) {
      console.error('Failed to load database overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  // Fetch Table Data
  const fetchTableData = async () => {
    if (!selectedTable) return;
    try {
      setLoadingTable(true);
      setError(null);
      const res = await api.getDatabaseTableData(selectedTable, {
        page,
        limit,
        search: debouncedSearch,
        sortBy: sortBy || undefined,
        sortOrder,
      });
      setTableData(res);
    } catch (err: any) {
      console.error(`Failed to fetch data for ${selectedTable}:`, err);
      setError(err?.message || `Failed to fetch table data for ${selectedTable}`);
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchTableData();
  }, [selectedTable, page, limit, debouncedSearch, sortBy, sortOrder]);

  const handleSelectTable = (tblName: string) => {
    if (tblName === selectedTable) return;
    setSelectedTable(tblName);
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
    setSortBy('');
    setSortOrder('desc');
    setFilterColumn('all');
    setFilterValue('');
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Export in Excel (.xlsx) / CSV with embedded photo thumbnails
  const handleExportExcel = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    if (!tableData || !tableData.rows.length) {
      window.alert('No records available to export.');
      return;
    }

    if (format === 'csv') {
      let exportRows: any[] = [];
      if (selectedTable === 'User') {
        exportRows = tableData.rows.map(u => ({
          'Register Number': u.rollNumber || u.userId || '',
          'Name': u.name || '',
          'Year': u.year || '',
          'Department': u.department || '',
          'Section': u.section || '',
          'Photo URL': u.avatarUrl || (u.rollNumber ? `https://srkrexams.in/SRKR/photo/${u.rollNumber.toUpperCase()}.jpg` : ''),
        }));
      } else {
        exportRows = tableData.rows.map(row => {
          const obj: Record<string, any> = {};
          tableData.columns.forEach(col => {
            let val = row[col];
            if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
            obj[col] = val ?? '';
          });
          return obj;
        });
      }
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, selectedTable);
      const fileName = `${selectedTable}_Export_${new Date().toISOString().slice(0, 10)}.csv`;
      XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'AttendEase';
      const worksheet = workbook.addWorksheet(selectedTable, {
        views: [{ showGridLines: true }],
      });

      if (selectedTable === 'User') {
        worksheet.columns = [
          { header: '#', key: 'index', width: 6 },
          { header: 'Photo', key: 'photo', width: 14 },
          { header: 'Register Number', key: 'rollNumber', width: 20 },
          { header: 'Name', key: 'name', width: 32 },
          { header: 'Year', key: 'year', width: 14 },
          { header: 'Department', key: 'department', width: 18 },
          { header: 'Section', key: 'section', width: 14 },
        ];

        const headerRow = worksheet.getRow(1);
        headerRow.height = 28;
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF18181B' },
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        for (let i = 0; i < tableData.rows.length; i++) {
          const u = tableData.rows[i];
          const rowIndex = i + 2;
          const row = worksheet.addRow({
            index: (page - 1) * limit + i + 1,
            photo: '',
            rollNumber: u.rollNumber || u.userId || '',
            name: u.name || '',
            year: u.year || '',
            department: u.department || '',
            section: u.section || '',
          });
          row.height = 56;
          row.alignment = { vertical: 'middle', horizontal: 'left' };
          row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };

          const photoUrl = u.avatarUrl || (u.rollNumber ? `https://srkrexams.in/SRKR/photo/${u.rollNumber.toUpperCase()}.jpg` : '');
          if (photoUrl) {
            try {
              const proxyUrl = `/api/users/proxy-image?url=${encodeURIComponent(photoUrl)}`;
              const imgRes = await fetch(proxyUrl);
              if (imgRes.ok) {
                const arrayBuf = await imgRes.arrayBuffer();
                const imageId = workbook.addImage({
                  buffer: arrayBuf,
                  extension: 'jpeg',
                });
                worksheet.addImage(imageId, {
                  tl: { col: 1.15, row: rowIndex - 0.88 },
                  ext: { width: 44, height: 52 },
                  editAs: 'oneCell',
                });
              }
            } catch (err) {
              // Ignore single photo failure
            }
          }
        }
      } else {
        worksheet.columns = tableData.columns.map(col => ({
          header: col,
          key: col,
          width: 22,
        }));
        const headerRow = worksheet.getRow(1);
        headerRow.height = 28;
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF18181B' },
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        tableData.rows.forEach(r => {
          const rowObj: Record<string, any> = {};
          tableData.columns.forEach(c => {
            let val = r[c];
            if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
            rowObj[c] = val ?? '';
          });
          worksheet.addRow(rowObj);
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = `${selectedTable}_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export Excel failed:', err);
      window.alert(`Failed to export Excel: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleExportJSON = async () => {
    try {
      const res = await api.exportDatabaseTable(selectedTable);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${selectedTable}_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('Failed to export JSON');
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatCellValue = (col: string, val: any) => {
    if (val === null || val === undefined) {
      return <span className="text-[#88929e] italic font-mono text-[11px]">NULL</span>;
    }
    if (typeof val === 'boolean') {
      return val ? (
        <span className="px-1.5 py-0.5 text-[10.5px] font-bold bg-emerald-50 text-emerald-700 rounded border border-emerald-200">TRUE</span>
      ) : (
        <span className="px-1.5 py-0.5 text-[10.5px] font-bold bg-slate-100 text-[#6b7280] rounded border border-slate-200">FALSE</span>
      );
    }
    if (col.toLowerCase().includes('password')) {
      return <span className="font-mono text-[#88929e] text-[11px]">••••••••</span>;
    }
    if (col === 'status') {
      const s = String(val).toLowerCase();
      const colorMap: Record<string, string> = {
        approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        rejected: 'bg-rose-50 text-rose-700 border-rose-200',
        pending: 'bg-amber-50 text-amber-700 border-amber-200',
        present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        absent: 'bg-rose-50 text-rose-700 border-rose-200',
      };
      return (
        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${colorMap[s] || 'bg-slate-50 text-[#374151] border-slate-200'}`}>
          {String(val)}
        </span>
      );
    }
    if (col === 'role') {
      return (
        <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-[#edf0f2] text-[#18181b] rounded-md border border-slate-200">
          {String(val)}
        </span>
      );
    }
    if (typeof val === 'object') {
      return <span className="font-mono text-[11px] text-[#374151] bg-[#edf0f2] px-1.5 py-0.5 rounded">{JSON.stringify(val)}</span>;
    }
    const str = String(val);
    if (str.length > 40) {
      return <span title={str}>{str.slice(0, 38)}...</span>;
    }
    return str;
  };

  // Local column filter if applied
  const displayedRows = (tableData?.rows || []).filter(row => {
    if (filterColumn === 'all' || !filterValue.trim()) return true;
    const cellVal = String(row[filterColumn] ?? '').toLowerCase();
    return cellVal.includes(filterValue.toLowerCase().trim());
  });

  return (
    <PageWrapper role="admin">
      <div className="max-w-[1520px] mx-auto space-y-4 pb-12">

        {/* ── Page Header matching Accounts & Students ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-[#18181b] tracking-tight">Database Tables</h1>
            <p className="text-[13px] text-[#6b7280]">
              Inspect live PostgreSQL database schema, raw records, and export table data
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Export in Excel Button */}
            <button
              type="button"
              onClick={() => handleExportExcel('xlsx')}
              title={`Export ${selectedTable} in Excel (.xlsx) format`}
              className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3.5 font-medium text-[13px] rounded-lg bg-[#edf0f2] hover:bg-[#e2e6e9] text-[#18181b] transition-all cursor-pointer shadow-xs"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" />
              <span>Export in Excel</span>
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={() => handleExportExcel('csv')}
              title="Export to CSV spreadsheet"
              className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3 font-medium text-[13px] rounded-lg bg-[#edf0f2] hover:bg-[#e2e6e9] text-[#18181b] transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>CSV</span>
            </button>

            <button
              onClick={() => { fetchOverview(); fetchTableData(); }}
              disabled={loadingTable}
              className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3.5 font-medium text-[13px] rounded-lg bg-[#edf0f2] hover:bg-[#e2e6e9] text-[#18181b] transition-all cursor-pointer disabled:opacity-50"
              title="Refresh table records"
            >
              <RefreshCw size={14} className={loadingTable ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="flex items-center justify-center gap-1.5 h-[38px] px-4 bg-[#18181b] hover:bg-[#27272a] active:bg-[#09090b] text-white font-medium text-[13px] rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* ── Table Selector Tabs (same style as Role Filter Tabs in Users.tsx) ── */}
        <div className="flex items-center gap-1 p-1 bg-[#edf0f2] rounded-lg w-fit overflow-x-auto max-w-full">
          {loadingOverview && overview.length === 0 ? (
            <div className="px-3 py-1.5 text-[12.5px] text-[#6b7280]">Loading tables...</div>
          ) : (
            overview.map((tbl) => {
              const isSelected = tbl.name === selectedTable;
              return (
                <button
                  key={tbl.name}
                  onClick={() => handleSelectTable(tbl.name)}
                  className={`px-3 py-1.5 text-[12.5px] font-medium rounded-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-white text-[#18181b] shadow-2xs font-semibold'
                      : 'text-[#6b7280] hover:text-[#18181b]'
                  }`}
                >
                  <span>{tbl.name}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10.5px] font-bold ${
                    isSelected ? 'bg-[#18181b] text-white' : 'bg-slate-200/90 text-[#6b7280]'
                  }`}>
                    {tbl.count}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* ── Filter & Search Toolbar with Filter Button ── */}
        <div className="flex gap-2.5 items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#88929e]" />
            <input
              type="text"
              placeholder={`Search ${selectedTable} table records...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-[40px] pl-9 pr-8 text-[13.5px] bg-[#edf0f2] text-[#18181b] placeholder:text-[#88929e] rounded-lg outline-none border border-transparent focus:border-slate-300 focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#88929e] hover:text-[#18181b]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Button */}
          <button
            type="button"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`h-[40px] px-3.5 rounded-lg border font-medium text-[13px] flex items-center gap-1.5 transition-all cursor-pointer ${
              showFilterPanel || (filterColumn !== 'all' && filterValue.trim())
                ? 'bg-[#18181b] text-white border-[#18181b]'
                : 'bg-[#edf0f2] hover:bg-[#e2e6e9] text-[#18181b] border-transparent'
            }`}
          >
            <Filter size={14} />
            <span>Filter</span>
            {filterColumn !== 'all' && filterValue.trim() && (
              <span className="w-2 h-2 rounded-full bg-orange-500" />
            )}
          </button>

          <div className="flex items-center gap-2 text-[12.5px] text-[#6b7280] bg-[#edf0f2] px-3 h-[40px] rounded-lg self-end sm:self-auto">
            <span>Rows:</span>
            <select
              value={limit}
              onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
              className="bg-transparent text-[#18181b] font-semibold outline-none cursor-pointer text-[12.5px]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>

        {/* ── Collapsible Column Filter Panel ── */}
        <AnimatePresence>
          {showFilterPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider block mb-1">
                    Select Column
                  </label>
                  <select
                    value={filterColumn}
                    onChange={e => setFilterColumn(e.target.value)}
                    className="w-full h-[36px] px-2.5 bg-[#edf0f2] text-[#18181b] rounded-lg text-[13px] font-medium outline-none border border-transparent focus:border-slate-300 focus:bg-white transition-all cursor-pointer font-mono"
                  >
                    <option value="all">Any Column</option>
                    {tableData?.columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider block mb-1">
                    Filter Value
                  </label>
                  <input
                    type="text"
                    placeholder="Enter value..."
                    value={filterValue}
                    onChange={e => setFilterValue(e.target.value)}
                    className="w-full h-[36px] px-3 bg-[#edf0f2] text-[#18181b] rounded-lg text-[13px] font-medium outline-none border border-transparent focus:border-slate-300 focus:bg-white transition-all"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterColumn('all');
                      setFilterValue('');
                    }}
                    className="h-[36px] px-3.5 text-[12.5px] font-medium bg-[#edf0f2] hover:bg-[#e2e6e9] text-[#18181b] rounded-lg transition-colors cursor-pointer w-full flex items-center justify-center"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Table Container (same card/border/header as Accounts and Students) ── */}
        {loadingTable && (!tableData || tableData.rows.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3 bg-white rounded-xl border border-slate-200">
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(24,24,27,0.15)', borderTopColor: '#18181b', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            <p className="text-[13px] font-medium text-[#6b7280]">Loading database records...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-rose-200 p-8 text-center text-rose-600">
            <p className="font-bold text-[14px]">{error}</p>
          </div>
        ) : !tableData || displayedRows.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-[#6b7280]">
            <Database size={32} className="mx-auto mb-2 opacity-30 text-[#18181b]" />
            <p className="text-[15px] font-bold text-[#18181b]">No records found</p>
            <p className="text-[12.5px] text-[#88929e] mt-1">
              {search || filterValue ? `No rows matching your search filter in ${selectedTable}` : `Table "${selectedTable}" is currently empty.`}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table Stats Bar */}
            <div className="px-4 py-2.5 bg-[#f8f9fa] border-b border-slate-200 flex items-center justify-between text-[12px] text-[#6b7280]">
              <span>
                Showing <strong className="text-[#18181b]">{(page - 1) * limit + 1}</strong> to{' '}
                <strong className="text-[#18181b]">{Math.min(page * limit, tableData.totalRows)}</strong> of{' '}
                <strong className="text-[#18181b]">{tableData.totalRows.toLocaleString()}</strong> rows in{' '}
                <strong className="text-[#18181b]">{selectedTable}</strong>
              </span>
              <span className="text-[11px] text-[#88929e]">
                Page {page} of {tableData.totalPages || 1} · Scroll horizontally if needed
              </span>
            </div>

            {/* Structured Grid Table (identical to Users.tsx) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#edf0f2] text-[#374151] border-b border-slate-200">
                    <th className="px-2.5 py-2.5 text-center font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 w-10">
                      #
                    </th>
                    {tableData.columns.map((col) => {
                      const isSorted = sortBy === col;
                      return (
                        <th
                          key={col}
                          onClick={() => handleSort(col)}
                          className="px-3.5 py-2.5 font-semibold text-[11.5px] uppercase tracking-wider border-r border-slate-200 whitespace-nowrap cursor-pointer hover:bg-[#e2e6e9] transition-colors select-none font-mono"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{col}</span>
                            {isSorted ? (
                              sortOrder === 'asc' ? <ArrowUp size={13} className="text-[#18181b]" /> : <ArrowDown size={13} className="text-[#18181b]" />
                            ) : (
                              <ArrowUpDown size={11} className="text-[#88929e] opacity-60" />
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th className="px-3.5 py-2.5 font-semibold text-[11.5px] uppercase tracking-wider text-center whitespace-nowrap w-20">
                      Inspect
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRows.map((row, index) => {
                    const rowNum = (page - 1) * limit + index + 1;
                    return (
                      <tr
                        key={row.id || row.requestId || row.submissionId || index}
                        className={`border-b border-slate-200 hover:bg-[#f0f4f8] transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-[#fafbfc]'
                        }`}
                      >
                        {/* Row Index */}
                        <td className="px-2.5 py-2 text-center text-[#88929e] font-mono text-[12px] border-r border-slate-200 w-10">
                          {rowNum}
                        </td>

                        {/* Columns */}
                        {tableData.columns.map((col) => (
                          <td
                            key={col}
                            className="px-3.5 py-2 text-[#18181b] border-r border-slate-200 whitespace-nowrap max-w-[260px] truncate text-[12.5px]"
                          >
                            {formatCellValue(col, row[col])}
                          </td>
                        ))}

                        {/* Actions / Inspect */}
                        <td className="px-3.5 py-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => setInspectingRow(row)}
                              className="w-6 h-6 bg-[#edf0f2] hover:bg-[#18181b] text-[#374151] hover:text-white rounded flex items-center justify-center transition-all cursor-pointer"
                              title="Inspect Row Details"
                            >
                              <Eye size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            {tableData.totalPages > 1 && (
              <div className="px-4 py-3 bg-[#f8f9fa] border-t border-slate-200 flex items-center justify-between text-[12.5px] text-[#6b7280]">
                <span>
                  Page <strong className="text-[#18181b]">{page}</strong> of <strong className="text-[#18181b]">{tableData.totalPages}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page <= 1 || loadingTable}
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    className="inline-flex items-center gap-1 h-[32px] px-3 font-medium text-[12px] rounded-lg bg-[#edf0f2] hover:bg-[#e2e6e9] text-[#18181b] disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>

                  <button
                    disabled={page >= tableData.totalPages || loadingTable}
                    onClick={() => setPage(prev => Math.min(tableData.totalPages, prev + 1))}
                    className="inline-flex items-center gap-1 h-[32px] px-3 font-medium text-[12px] rounded-lg bg-[#edf0f2] hover:bg-[#e2e6e9] text-[#18181b] disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Row Inspection Modal ── */}
        <Modal
          isOpen={!!inspectingRow}
          onClose={() => setInspectingRow(null)}
          title={`${selectedTable} Row Details`}
          size="lg"
        >
          {inspectingRow && (
            <div className="space-y-4">
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden bg-white max-h-[380px] overflow-y-auto">
                {Object.entries(inspectingRow).map(([key, val]) => (
                  <div key={key} className="px-3.5 py-2 flex items-start justify-between gap-4 text-[13px]">
                    <span className="font-mono font-semibold text-[#6b7280] text-[12px] flex-shrink-0">
                      {key}:
                    </span>
                    <div className="flex items-center gap-2 text-right">
                      <span className="font-mono text-[#18181b] break-all text-[12px]">
                        {val === null ? (
                          <span className="text-[#88929e] italic">NULL</span>
                        ) : typeof val === 'object' ? (
                          JSON.stringify(val)
                        ) : (
                          String(val)
                        )}
                      </span>
                      <button
                        onClick={() => copyToClipboard(String(val ?? ''), key)}
                        title="Copy field value"
                        className="p-1 text-[#88929e] hover:text-[#18181b] transition-colors"
                      >
                        {copiedKey === key ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-[11.5px] font-semibold text-[#6b7280] uppercase tracking-wider">Raw JSON</h4>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(inspectingRow, null, 2), 'raw-json')}
                    className="text-[12px] text-[#18181b] hover:underline font-medium flex items-center gap-1"
                  >
                    {copiedKey === 'raw-json' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span>{copiedKey === 'raw-json' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#18181b] text-emerald-400 rounded-lg text-[11.5px] font-mono overflow-x-auto max-h-40 border border-slate-800">
                  {JSON.stringify(inspectingRow, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setInspectingRow(null)}
                  className="h-[36px] px-4 bg-[#18181b] hover:bg-[#27272a] text-white text-[13px] font-medium rounded-lg transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>

      </div>
    </PageWrapper>
  );
}
