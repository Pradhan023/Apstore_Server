import { User } from "../model/user.model.js";
import { Product } from "../model/product.model.js";
import { Order } from "../model/order.model.js";

export const getanalyticsData = async() => {
  const totalUser = await User.countDocuments({}); //countDocuments() is a mongoose method which is used to count the number of documents in the collection
  const totalProduct = await Product.countDocuments({});

  const sales = await Order.aggregate([
    {
      $group: {
        _id: null, //null means we want to group all the data together
        totalSales: {
          $sum: 1, // $sum: 1, it's equivalent to counting the number of documents in the collection. In other words, it's summing up a value of 1 for each document, effectively counting the total number of documents. inshort no. of collection of order documents
        },
        totalRevenue: {
          $sum: "$totalAmount", // "$totalAmount" means we want to sum all the data of totalAmount
        },
      },
    },
  ]);


  const { totalSales, totalRevenue } = sales[0] || {
    totalSales: 0,
    totalRevenue: 0,
  }; //aggregation will return an array of objects and we want to get the first element of the array , sales[0] means we want to get the first element of the array sales.

  return {
    totaluser: totalUser,
    totalProduct: totalProduct,
    totalSales,
    totalRevenue,
  };
};



export const dailysalesData = async (startDate,endDate) => {
  try {
    const salesdata = await Order.aggregate([
      {
        $match: {
          createdAt: {
            // match the createdAt field in between startDate and endDate with gte and lte  , 7days ago
            $gte: startDate, // $gte means greater than or equal to
            $lte: endDate, // $lte means less than or equal to
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              // $dateToString is a mongoose method which is used to convert a date to a string
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          sales: {
            $sum: 1, // $sum: 1, it's equivalent to counting the number of documents in the collection. In other words, it's summing up a value of 1 for each document, effectively counting the total number of documents.
          },
          revenue: {
            $sum: "$totalAmount", // "$totalAmount" means we want to sum all the data of totalAmount
          },
        },
      },
      { $sort: { _id: 1 } }, // $sort : { _id : 1 } means we want to sort the data by _id in ascending order
    ]);
    // example data of dailysales 7day data
    // [{
    //   "_id": "2023-05-01",
    //   "sales": 1,
    //   "revenue": 100
    // },
    // {
    //   "_id": "2023-05-02",
    //   "sales": 2,
    //   "revenue": 200
    // },
    // {
    //   "_id": "2023-05-03",
    //   "sales": 3,
    //   "revenue": 300
    // },
    // {
    //   "_id": "2023-05-04",
    //   "sales": 4,
    //   "revenue": 400
    // },
    // {
    //   "_id": "2023-05-05",
    //   "sales": 5,
    //   "revenue": 500
    // },
    // {
    //   "_id": "2023-05-06",
    //   "sales": 6,
    //   "revenue": 600
    // },
    // {
    //   "_id": "2023-05-07",
    //   "sales": 7,
    //   "revenue": 700
    // },
    // }
    // }]

    // dates

    const dateArray = getDatesInRange(startDate, endDate);
    return dateArray.map((date) => {
      const foundData = salesdata.find((item) => item._id === date);
      return {
        date,
        sales: foundData?.sales || 0,
        revenue: foundData?.revenue || 0,
      };
    });
  } catch (error) {
    throw error;
  }
};

// date range
export function getDatesInRange(startDate,endDate) {
  const dates = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split("T")[0]); // push the current date to the array // split the date and time and get only the date
    currentDate.setDate(currentDate.getDate() + 1); // increment the date by 1 day
  }
  return dates;

  //   dates example
  // [
  //     2025-02-27T15:44:54.714Z,
  //     2025-02-28T15:44:54.714Z,
  //     2025-03-01T15:44:54.714Z,
  //     2025-03-02T15:44:54.714Z,
  //     2025-03-03T15:44:54.714Z,
  //     2025-03-04T15:44:54.714Z,
  //     2025-03-05T15:44:54.714Z,
  //     2025-03-06T15:44:54.714Z
  //   ]
}