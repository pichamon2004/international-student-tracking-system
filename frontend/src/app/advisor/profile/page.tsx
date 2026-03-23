import { FiUpload } from "react-icons/fi";

import { MdModeEditOutline } from "react-icons/md";

export type AdvisorDetail = {
  id: string;
  prefix: "Mr." | "Ms." | "Mrs.";
  firstName: string;
  middleName?: string;
  lastName: string;
  tel: string;
  email: string;
  nationality: string;

  workPermitNo: string;
  workPermitIssue: string;   // ISO date
  workPermitExpiry: string;  // ISO date

  workPermitImage: string; // URL
  createdAt: string;
  updatedAt: string;
};
export const mockWorkPermits: AdvisorDetail[] = [
  {
    id: "wp_001",
    prefix: "Mr.",
    firstName: "Somchai",
    middleName: "K.",
    lastName: "Wongchai",
    tel: "0812345678",
    email: "somchai.w@example.com",
    nationality: "Thai",

    workPermitNo: "WP-TH-2024-0001",
    workPermitIssue: "2024-01-15",
    workPermitExpiry: "2026-01-14",

    workPermitImage: "https://example.com/images/workpermit1.jpg",
    createdAt: "2024-01-10T10:00:00Z",
    updatedAt: "2024-01-10T10:00:00Z",
  },
  {
    id: "wp_002",
    prefix: "Ms.",
    firstName: "Anna",
    middleName: "",
    lastName: "Kim",
    tel: "0898765432",
    email: "anna.kim@example.com",
    nationality: "South Korean",

    workPermitNo: "WP-TH-2024-0002",
    workPermitIssue: "2023-06-01",
    workPermitExpiry: "2025-05-31",

    workPermitImage: "https://example.com/images/workpermit2.jpg",
    createdAt: "2023-06-01T08:30:00Z",
    updatedAt: "2023-06-01T08:30:00Z",
  },
  {
    id: "wp_003",
    prefix: "Mr.",
    firstName: "John",
    middleName: "D.",
    lastName: "Smith",
    tel: "0823456789",
    email: "john.smith@example.com",
    nationality: "American",

    workPermitNo: "WP-TH-2022-0999",
    workPermitIssue: "2022-03-10",
    workPermitExpiry: "2024-03-09",

    workPermitImage: "https://example.com/images/workpermit3.jpg",
    createdAt: "2022-03-10T09:00:00Z",
    updatedAt: "2024-02-01T12:00:00Z",
  }
];
function AdvisorProfilePage() {


    return (
        <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col ">
            <h1 className="text-2xl font-semibold text-primary pb-6">Profile</h1>
            <div className=" w-full h-full flex flex-col gap-6 ">

                <div className=" flex items-center justify-start gap-6 border rounded-2xl px-6 py-6">
                    <img src="https://api.computing.kku.ac.th//storage/images/1661876218-pusadeeseresangtakul1_1.png" alt="Photo" className="w-24 h-24 rounded-xl" />
                    <div className="flex flex-col items-start justify-around gap-3 h-full">
                        <p className="text-xl font-medium">Asst. Prof. Pusadee Seresangtakul</p>
                        <button className="text-primary bg-secondary px-3 py-2 rounded-xl flex items-center justify-center gap-3">
                            <FiUpload /> Upload New Photo
                        </button>
                    </div>
                </div>
                <div className="border flex-1 rounded-2xl p-6">
                    <div className=" flex items-center justify-between">
                        <p className=" text-xl font-medium text-primary">Personal Information</p>
                        <div>
                            <button className="flex items-center justify-center gap-3 border border-primary rounded-full px-4 py-2 font-normal text-primary"><MdModeEditOutline />Edit</button>
                        </div>
                    </div>
                    <div>
                    </div>
                </div>

            </div>
        </div>
    )
}
export default AdvisorProfilePage