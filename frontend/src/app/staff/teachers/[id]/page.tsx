import { FiUpload } from "react-icons/fi";
import { BsPeopleFill } from "react-icons/bs";
import { FaRegCircleCheck } from "react-icons/fa6";
import { FaListCheck } from "react-icons/fa6";

function page() {
  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col ">
                <h1 className="text-2xl font-semibold text-primary">Profile</h1>
                <div className="grid md:grid-cols-5 w-full h-full gap-6">
                    <div className="flex flex-col md:col-span-3 h-full w-full border-r-2">
                        <div className=" flex items-center justify-start gap-6 border-b-2 py-6">
                            <img src="https://api.computing.kku.ac.th//storage/images/1661876218-pusadeeseresangtakul1_1.png" alt="Photo" className="w-24 h-24 rounded-xl" />
                            <div className="flex flex-col items-start justify-around gap-3 h-full">
                                <p className="text-xl font-medium">Asst. Prof. Pusadee Seresangtakul</p>
                                <button className="text-primary bg-secondary px-3 py-2 rounded-xl flex items-center justify-center gap-3">
                                    <FiUpload /> Upload New Photo
                                </button>
                            </div>
                        </div>
                        <div className="bg-red-300 flex-1">
                            <p className="py-6 text-xl font-medium text-primary">Personal Information</p>
                            <div>
    
                            </div>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="pb-6">
                            <p className="py-6 text-xl font-medium text-primary">Tasks Overview</p>
                            <div className="flex gap-6">
                                <div className="bg-[#BFE6FF] w-36 h-28 rounded-xl p-4 flex flex-col items-center justify-between">
                                    <div className="w-full flex items-center justify-between">
                                        <BsPeopleFill size={24} className="text-primary"/>
                                        <p className="text-xl">2</p>
                                    </div>
                                    <div className="w-full"><p className="text-xs font-normal">Total Students</p></div>
                                </div>
                                <div className="bg-[#BFFFC3] w-36 h-28 rounded-xl p-4 flex flex-col items-center justify-between">
                                    <div className="w-full flex items-center justify-between">
                                        <FaRegCircleCheck size={24} className="text-[#4BCA5E]"/>
                                        <p className="text-xl">2</p>
                                    </div>
                                    <div className="w-full"><p className="text-xs font-normal">Done Request</p></div>
                                </div>
                                <div className="bg-[#FFBFC0] w-36 h-28 rounded-xl p-4 flex flex-col items-center justify-between">
                                    <div className="w-full flex items-center justify-between">
                                        <FaListCheck size={24} className="text-[#EE4F4F]"/>
                                        <p className="text-xl">2</p>
                                    </div>
                                    <div className="w-full"><p className="text-xs font-normal">Request To Do</p></div>
                                </div>
    
                            </div>
                        </div>
                        <div>
                            <p className="py-6 text-xl font-medium text-primary">Assigned Students</p>
                            
                        </div>
                    </div>
                </div>
            </div>
  )
}
export default page