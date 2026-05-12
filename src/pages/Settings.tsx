import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import type { WarningSettings, User, UserRole } from '../lib/types';

const STORAGE_KEY = 'system_settings';

const DEFAULT_WARNING_SETTINGS: WarningSettings = {
  expireReminderDays: 30,
  kValueThreshold: 1.0,
  inspectionIntervalDays: 90,
};

const DEFAULT_USERS: User[] = [
  { id: 'USR001', username: '张三', role: 'calculator', enabled: true },
  { id: 'USR002', username: '王五', role: 'admin', enabled: true },
];

const ROLE_LABELS: Record<UserRole, string> = {
  calculator: '计算员',
  admin: '管理员',
};

const ROLE_PERMISSIONS: Record<UserRole, string> = {
  calculator: '查看桥梁、执行计算、查看历史',
  admin: '全部功能 + 系统设置、用户管理',
};

interface SettingsData {
  warningSettings: WarningSettings;
  users: User[];
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    warningSettings: DEFAULT_WARNING_SETTINGS,
    users: DEFAULT_USERS,
  });
  const [toast, setToast] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState<{ userId: string; tempPassword: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 过滤掉无效角色的用户
        const validUsers = (parsed.users || DEFAULT_USERS).filter(
          (user: User) => user.role === 'calculator' || user.role === 'admin'
        );
        setSettings({
          warningSettings: { ...DEFAULT_WARNING_SETTINGS, ...parsed.warningSettings },
          users: validUsers.length > 0 ? validUsers : DEFAULT_USERS,
        });
      } catch {
        // use defaults
      }
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setToast('设置已保存');
    setTimeout(() => setToast(null), 3000);
  };

  const updateWarningSettings = (updates: Partial<WarningSettings>) => {
    setSettings((prev) => ({
      ...prev,
      warningSettings: { ...prev.warningSettings, ...updates },
    }));
  };

  const handleAddUser = () => {
    setEditingUser({ id: '', username: '', role: 'calculator', enabled: true });
    setShowUserModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser({ ...user });
    setShowUserModal(true);
  };

  const handleSaveUser = () => {
    if (!editingUser || !editingUser.username.trim()) return;

    if (editingUser.id) {
      setSettings((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === editingUser.id ? editingUser : u)),
      }));
    } else {
      const newUser: User = {
        ...editingUser,
        id: `USR${String(Date.now()).slice(-6)}`,
      };
      setSettings((prev) => ({
        ...prev,
        users: [...prev.users, newUser],
      }));
      const tempPassword = Math.random().toString(36).slice(-8);
      setShowResetPassword({ userId: newUser.id, tempPassword });
    }
    setShowUserModal(false);
    setEditingUser(null);
    setToast(editingUser.id ? '用户已更新' : '用户已创建');
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteUser = (userId: string) => {
    setSettings((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== userId),
    }));
    setShowDeleteConfirm(null);
    setToast('用户已删除');
    setTimeout(() => setToast(null), 3000);
  };

  const handleResetPassword = (userId: string) => {
    const tempPassword = Math.random().toString(36).slice(-8);
    setShowResetPassword({ userId, tempPassword });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">系统设置</h2>
          <p className="text-sm text-gray-500 mt-1">配置系统参数和用户权限</p>
        </div>
      </div>

      {/* Warning Settings Section */}
      <div className="mb-10">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">系统设置</h3>
            <button
              onClick={saveSettings}
              className="flex items-center gap-2 px-4 py-1.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
          <div className="p-5">
            <div className="flex flex-col md:flex-row md:items-start">
              {/* Inspection Interval */}
              <div className="flex-1 px-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  定期巡检天数
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settings.warningSettings.inspectionIntervalDays}
                  onChange={(e) =>
                    updateWarningSettings({ inspectionIntervalDays: parseInt(e.target.value) || 90 })
                  }
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="hidden md:block w-px bg-gray-200 self-stretch my-1" />

              {/* Expire Reminder */}
              <div className="flex-1 px-4 mt-4 md:mt-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  提前提醒天数
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settings.warningSettings.expireReminderDays}
                  onChange={(e) =>
                    updateWarningSettings({ expireReminderDays: parseInt(e.target.value) || 30 })
                  }
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="hidden md:block w-px bg-gray-200 self-stretch my-1" />

              {/* K Value Threshold */}
              <div className="flex-1 px-4 mt-4 md:mt-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最低正常K值
                </label>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={10}
                  value={settings.warningSettings.kValueThreshold}
                  onChange={(e) =>
                    updateWarningSettings({ kValueThreshold: parseFloat(e.target.value) || 1.0 })
                  }
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <div className="mb-10">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">用户权限管理</h3>
            <button
              onClick={handleAddUser}
              className="flex items-center gap-2 px-4 py-1.5 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增
            </button>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    角色
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    权限范围
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {settings.users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ROLE_PERMISSIONS[user.role]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.enabled ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleResetPassword(user.id)}
                          className="text-gray-600 hover:text-gray-900 px-2 py-1"
                          title="重置密码"
                        >
                          重置密码
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(user.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* User Modal */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingUser.id ? '编辑用户' : '新增用户'}
              </h3>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户名
                </label>
                <input
                  type="text"
                  value={editingUser.username}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, username: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入用户名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      role: e.target.value as UserRole,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="calculator">计算员</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingUser.enabled}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, enabled: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">启用账户</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveUser}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-gray-600 mb-4">确定要删除该用户吗？此操作不可撤销。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteUser(showDeleteConfirm)}
                className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">密码已重置</h3>
            <p className="text-gray-600 mb-4">
              临时密码：<span className="font-mono font-bold text-blue-600">{showResetPassword.tempPassword}</span>
            </p>
            <p className="text-xs text-gray-500 mb-4">请妥善保存此密码，关闭后将无法再次查看。</p>
            <button
              onClick={() => setShowResetPassword(null)}
              className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
