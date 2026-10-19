import type { IconType } from 'react-icons';

// Icons from the Figma design (Iconify sets that react-icons doesn't ship).
// Same contract as react-icons: 1em square, currentColor, `size`/`className`.

const svgProps = (size?: string | number, className?: string) => ({
  xmlns: 'http://www.w3.org/2000/svg',
  width: size ?? '1em',
  height: size ?? '1em',
  className,
  'aria-hidden': true,
});

// charm:person — stroke 1 on its 16-unit grid (the original 1.5 drew heavier than
// the 24-unit icons beside it; 1 here matches their 1.5)
export const PersonIcon: IconType = ({ size, className }) => (
  <svg {...svgProps(size, className)} viewBox="0 0 16 16">
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1">
      <circle cx="8" cy="6" r="3.25" />
      <path d="m2.75 14.25c0-2.5 2-5 5.25-5s5.25 2.5 5.25 5" />
    </g>
  </svg>
);

// material-symbols-light:passport-outline-rounded
export const PassportIcon: IconType = ({ size, className }) => (
  <svg {...svgProps(size, className)} viewBox="0 0 24 24">
    <path fill="currentColor" d="M8.942 18.192h6.116q.19 0 .316-.126q.126-.125.126-.316t-.126-.316q-.126-.126-.316-.126H8.942q-.19 0-.316.126q-.126.125-.126.316t.126.316t.316.126M12 15.038q1.864 0 3.191-1.328q1.328-1.327 1.328-3.210q0-1.864-1.328-3.191Q13.863 5.980 12 5.980q-1.883 0-3.210 1.328Q7.462 8.636 7.462 10.5q0 1.883 1.328 3.210q1.327 1.328 3.210 1.328m0-1.002q-.412-.602-.675-1.383q-.263-.782-.32-1.71h1.97q-.056.928-.32 1.71q-.263.781-.655 1.383m-1.127-.075q-.984-.317-1.66-1.123t-.844-1.896h1.752q.031.721.208 1.476t.544 1.544m2.12 0q.386-.731.601-1.496q.216-.764.266-1.524h1.752q-.189 1.09-.893 1.897t-1.727 1.123M8.37 10.058q.189-1.148.912-1.973T11.008 7q-.406.616-.621 1.39q-.216.773-.266 1.668zm2.637 0q.055-.967.319-1.759T12 6.925q.392.583.656 1.374q.263.792.319 1.759zm2.853 0q-.03-.837-.246-1.611q-.215-.774-.64-1.447q1.061.26 1.785 1.094q.723.835.854 1.964zM5.808 21q-.348 0-.578-.23T5 20.192V3.808q0-.349.23-.578T5.808 3h11.577q.67 0 1.143.472q.472.472.472 1.144v14.769q0 .67-.472 1.143q-.472.472-1.143.472zM6 20h11.385q.23 0 .423-.192t.192-.424V4.616q0-.231-.192-.424T17.384 4H6zm0 0V4z" />
  </svg>
);

// proicons:document
export const DocumentIcon: IconType = ({ size, className }) => (
  <svg {...svgProps(size, className)} viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
      <rect width="15" height="18.5" x="4.5" y="2.75" rx="3.5" />
      <path d="M8.5 6.755h7m-7 4h7m-7 4H12" />
    </g>
  </svg>
);

// solar:health-linear
export const HealthIcon: IconType = ({ size, className }) => (
  <svg {...svgProps(size, className)} viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5">
      <path strokeLinejoin="round" d="M2 9.3175C2 13.0468 6.01943 16.991 8.96173 19.3786C10.2937 20.4595 10.9597 21 12 21C13.0403 21 13.7063 20.4596 15.0383 19.3787C17.9806 16.991 22 13.0468 22 9.31747C22 3.08748 16.4998 0.761498 12 5.57412C7.50016 0.761498 2 3.08748 2 9.3175Z" />
      <path d="M18.5 9.00002H16.5M16.5 9.00002L14.5 9.00002M16.5 9.00002L16.5 7M16.5 9.00002L16.5 11" />
    </g>
  </svg>
);

// solar:square-academic-cap-linear
export const AcademicCapIcon: IconType = ({ size, className }) => (
  <svg {...svgProps(size, className)} viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5">
      <path d="M9.78272 3.49965C11.2037 2.83345 12.7962 2.83345 14.2172 3.49965L20.9084 6.63664C22.3639 7.31899 22.3639 9.68105 20.9084 10.3634L14.2173 13.5004C12.7963 14.1665 11.2038 14.1665 9.78281 13.5004L3.0916 10.3634C1.63613 9.68101 1.63614 7.31895 3.0916 6.63659L9.78272 3.49965Z" />
      <path d="M2 8.5V14" />
      <path d="M19 11.5V16.6254C19 17.6334 18.4965 18.5772 17.6147 19.0656C16.1463 19.8787 13.796 21 12 21C10.204 21 7.8537 19.8787 6.38533 19.0656C5.5035 18.5772 5 17.6334 5 16.6254V11.5" />
    </g>
  </svg>
);

// octicon:people-24
export const PeopleIcon: IconType = ({ size, className }) => (
  <svg {...svgProps(size, className)} viewBox="0 0 24 24">
    <path fill="currentColor" d="M3.5 8a5.5 5.5 0 1 1 8.596 4.547a9.005 9.005 0 0 1 5.9 8.18a.751.751 0 0 1-1.5.045a7.5 7.5 0 0 0-14.993 0a.75.75 0 0 1-1.499-.044a9.005 9.005 0 0 1 5.9-8.181A5.5 5.5 0 0 1 3.5 8M9 4a4 4 0 1 0 0 8a4 4 0 0 0 0-8m8.29 4q-.221 0-.434.03a.75.75 0 1 1-.212-1.484a4.53 4.53 0 0 1 3.38 8.097a6.690 6.690 0 0 1 3.956 6.107a.75.75 0 0 1-1.5 0a5.190 5.190 0 0 0-3.696-4.972l-.534-.16v-1.676l.41-.209A3.030 3.030 0 0 0 17.29 8" />
  </svg>
);
