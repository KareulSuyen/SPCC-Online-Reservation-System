import { CiPause1 } from "react-icons/ci";
import { useEffect } from "react";
import { IoAlert } from "react-icons/io5";
import styles from "../styles/banAlert.module.scss";

const BanAlert = ({ isOpen, onClose, banData }) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
  }, [isOpen]);

  if (!isOpen || !banData) return null;

  const isPermanent = banData.permanent;
  const banUntil = banData.ban_until
    ? new Date(banData.ban_until).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const reason = banData.detail
    ? banData.detail
        .replace(/^Your account is (temporarily )?banned until .+?\.\s*/i, "")
        .trim()
    : "No reason provided";

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div
          className={`${styles.header} ${
            isPermanent ? styles.permanent : styles.temporary
          }`}
        >
          <div className={styles.icon}>
            {isPermanent ? (
              <IoAlert size={40} color="red" />
            ) : (
              <CiPause1 size={40} color="white" />
            )}
          </div>

          <h2 className={styles.title}>
            {isPermanent ? "BANNED" : "SUSPENDED"}
          </h2>

          {!isPermanent && (
            <p className={styles.until}>Until {banUntil}</p>
          )}
        </div>

        <div className={styles.content}>
          <div className={styles.reasonBox}>
            <p className={styles.reasonLabel}>REASON</p>
            <p className={styles.reasonText}>{reason}</p>
          </div>

          <div
            className={`${styles.notice} ${
              isPermanent ? styles.noticePermanent : styles.noticeTemporary
            }`}
          >
            <p>
              {isPermanent
                ? "This ban is permanent. Contact support if you believe this is an error."
                : "Your access will be restored automatically after the suspension period."}
            </p>
          </div>

          <button
            onClick={onClose}
            className={`${styles.button} ${
              isPermanent ? styles.permanentBtn : styles.temporaryBtn
            }`}
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
};

export default BanAlert;
