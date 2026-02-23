import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Descriptions,
  Space,
  Spin,
  Tag,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { fetchMyProfileApi, uploadMyAvatarApi } from "@/apis/user";
import type { UserProfileResponse } from "@/types/user/query";
import { SpaceBackground } from "@/pages/Home/components/ContentArea/SpaceBackground";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export const UserPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const profileResp = await fetchMyProfileApi();
      setProfile(profileResp);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUserData();
  }, []);

  const roleLabel = useMemo(() => {
    if (!profile?.role) return "-";
    if (profile.role === "ADMIN") return "管理员";
    return "普通用户";
  }, [profile?.role]);

  const mobileOrEmail = useMemo(() => {
    const value = profile?.mobileOrEmail?.trim() ?? "";
    return value || "-";
  }, [profile?.mobileOrEmail]);

  const onUploadAvatar = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      message.warning("请选择图片文件");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      message.warning("头像大小不能超过 5MB");
      return;
    }

    setUploading(true);
    try {
      const resp = await uploadMyAvatarApi({ avatar: file });
      setProfile((prev) =>
        prev ? { ...prev, avatarUrl: resp.avatarUrl } : prev,
      );
      message.success("头像上传成功");
    } finally {
      setUploading(false);
    }
  };

  const pickAndUploadAvatar = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      await onUploadAvatar(file);
    };
    input.click();
  };

  return (
    <SpaceBackground paddingClassName="py-10">
      <div className="relative mx-auto w-full max-w-4xl px-4">
        <Card className="rounded-3xl border border-white/60 bg-white/65 shadow-lg backdrop-blur">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="mpcs-text-strong text-2xl font-semibold">
              个人中心
            </h2>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/home")}>
              返回首页
            </Button>
          </div>

          {loading ? (
            <div className="py-10 text-center">
              <Spin />
            </div>
          ) : profile ? (
            <div className="flex flex-col gap-6">
              <Card className="rounded-2xl border border-white/60 bg-white/70 shadow-sm">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  <Avatar
                    size={96}
                    src={profile.avatarUrl}
                    icon={<UserOutlined />}
                    className="shadow-md"
                  />
                  <div className="flex-1">
                    <div className="text-xl font-semibold">
                      {profile.username}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Tag color="blue">{roleLabel}</Tag>
                      <Tag
                        color={profile.mobileIdentified ? "green" : "orange"}
                      >
                        {profile.mobileIdentified
                          ? "已绑定手机号"
                          : "未绑定手机号"}
                      </Tag>
                    </div>
                    <Space className="mt-4">
                      <Button
                        type="primary"
                        icon={<UploadOutlined />}
                        loading={uploading}
                        onClick={pickAndUploadAvatar}
                      >
                        上传头像
                      </Button>
                      <Button onClick={() => void loadUserData()}>
                        刷新资料
                      </Button>
                    </Space>
                  </div>
                </div>
              </Card>

              <Card className="rounded-2xl border border-white/60 bg-white/70 shadow-sm">
                <Descriptions
                  title="账户信息"
                  column={1}
                  bordered
                  size="middle"
                >
                  <Descriptions.Item label="用户名">
                    {profile.username}
                  </Descriptions.Item>
                  <Descriptions.Item label="邮箱/手机号">
                    {mobileOrEmail}
                  </Descriptions.Item>
                  <Descriptions.Item label="角色">
                    {roleLabel}
                  </Descriptions.Item>
                  <Descriptions.Item label="用户ID">
                    {profile.userId}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </div>
          ) : (
            <div className="mpcs-text-danger text-center">
              加载用户信息失败，请刷新重试
            </div>
          )}
        </Card>
      </div>
    </SpaceBackground>
  );
};
