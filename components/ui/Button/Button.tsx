import type { ButtonHTMLAttributes, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { cva, type VariantProps } from 'class-variance-authority';
import loadingAnimation from '@/assets/lotties/loading.json';
import { Icon } from '../Icon';
import styles from './Button.module.scss';

const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false, // 서버 사이드 렌더링 비활성화
});

// TODO 임시로 variant error, kakao 등이 존재하지만 차후 수정 필요
const buttonVariants = cva(styles.base, {
  variants: {
    variant: {
      primary: styles['variant-primary'],
      secondary: styles['variant-secondary'],
      kakao: styles['variant-kakao'],
      error: styles['variant-error'],
    },
    size: {
      sm: styles['size-sm'],
      md: styles['size-md'],
      lg: styles['size-lg'],
    },
    width: {
      default: styles['width-default'],
      full: styles['width-full'],
    },
    state: {
      default: styles['state-default'],
      disabled: styles['state-disabled'],
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    width: 'default',
    state: 'default',
  },
});

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  children: ReactNode;
  isLoading?: boolean;
}

export function Button({
  children,
  variant,
  size = 'md',
  width = 'default',
  className = '',
  disabled,
  isLoading = false,
  ...props
}: ButtonProps) {
  const isKakao = variant === 'kakao';
  return (
    <button
      className={`${buttonVariants({ variant, size, width, state: disabled ? 'disabled' : 'default' })} ${className}`}
      disabled={disabled}
      {...props}
    >
      {isLoading ? (
        <div className={styles.loadingWrapper}>
          <Lottie animationData={loadingAnimation} loop={true} className={styles.loadingAnimation} />
        </div>
      ) : (
        <>
          {isKakao && (
            <div className={styles.kakaoIcon}>
              <Icon name="kakao" size={32} />
            </div>
          )}
          {children}
        </>
      )}
    </button>
  );
}
