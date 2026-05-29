'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { runApi, type DashboardStats, type RunListItem } from '@/lib/api';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BoltIcon from '@mui/icons-material/Bolt';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentRuns, setRecentRuns] = useState<RunListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadDashboard() {
    try {
      const [statsData, runsData] = await Promise.all([
        runApi.getStats(),
        runApi.list(),
      ]);
      setStats(statsData);
      setRecentRuns(runsData.slice(0, 6));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-muted animate-pulse text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="text-danger text-lg">⚠️ Connection Error</div>
        <div className="text-muted text-sm max-w-md text-center">{error}</div>
        <div className="text-muted text-xs">
          Make sure the backend is running on http://localhost:8000
        </div>
        <button onClick={loadDashboard} className="btn btn-primary mt-2">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted text-sm mt-1">AI Order Supervisor Overview</p>
        </div>
        <Link href="/runs" className="btn btn-primary">
          + New Run
        </Link>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total Runs"    value={stats.total_runs}     icon={<Inventory2Icon />}   color="primary" />
          <StatCard label="Active Runs"   value={stats.active_runs}    icon={<SyncIcon />}          color="accent"  />
          <StatCard label="Completed"     value={stats.completed_runs} icon={<CheckCircleIcon />}   color="green"   />
          <StatCard label="Events"        value={stats.total_events}   icon={<BoltIcon />}          color="yellow"  />
          <StatCard label="Actions Taken" value={stats.total_actions}  icon={<TrackChangesIcon />}  color="purple"  />
        </div>
      )}

      {/* Recent Runs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Runs</h2>
          <Link
            href="/runs"
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--color-primary)' }}
          >
            View all →
          </Link>
        </div>

        {recentRuns.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-4xl mb-4 flex justify-center text-primary">
              <RocketLaunchIcon fontSize="inherit" />
            </div>
            <div className="text-foreground font-medium mb-2">No runs yet</div>
            <div className="text-muted text-sm mb-4">
              Create your first order supervision run to get started.
            </div>
            <Link href="/runs" className="btn btn-primary">
              Create Run
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentRuns.map((run, i) => (
              <Link
                key={run.id}
                href={`/runs/${run.id}`}
                className="block"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="glass-card p-4 hover:scale-[1.01] transition-transform animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="font-mono text-sm font-medium"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {run.order_id}
                    </span>
                    <StatusBadge status={run.status} />
                  </div>
                  <div className="text-xs text-muted space-y-1">
                    <div>Supervisor: {run.supervisor_name || 'Unknown'}</div>
                    <div>Created: {new Date(run.created_at).toLocaleString()}</div>
                    {run.next_wake_at && (
                      <div style={{ color: 'var(--color-primary)', opacity: 0.8 }}>
                        Next wake: {new Date(run.next_wake_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
