import { Input, Modal } from "antd";

interface MemberModalProps {
  open: boolean;
  title: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const MemberModal = ({
  open,
  title,
  inputValue,
  onInputChange,
  onConfirm,
  onCancel,
}: MemberModalProps) => (
  <Modal
    open={open}
    title={title}
    okText="确认"
    cancelText="取消"
    onCancel={onCancel}
    onOk={() => void onConfirm()}
  >
    <Input.TextArea
      rows={5}
      value={inputValue}
      onChange={(event) => onInputChange(event.target.value)}
      placeholder="请输入用户ID（如 USR20260000000000001），多个可用逗号、空格或换行分隔"
    />
  </Modal>
);

export const RemoveMemberModal = ({
  open,
  title,
  inputValue,
  onInputChange,
  onConfirm,
  onCancel,
}: MemberModalProps) => (
  <Modal
    open={open}
    title={title}
    okText="确认移除"
    cancelText="取消"
    onCancel={onCancel}
    onOk={() => void onConfirm()}
  >
    <Input.TextArea
      rows={5}
      value={inputValue}
      onChange={(event) => onInputChange(event.target.value)}
      placeholder="请输入要移除的用户ID，多个可用逗号、空格或换行分隔"
    />
  </Modal>
);
