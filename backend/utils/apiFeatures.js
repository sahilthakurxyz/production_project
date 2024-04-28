class ApiFeatures {
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;
  }
  search() {
    const keyword = {};
    if (this.queryStr.keyword) {
      keyword.$or = [
        {
          brand: {
            $regex: this.queryStr.keyword,
            $options: "i",
          },
        },
        {
          name: {
            $regex: this.queryStr.keyword,
            $options: "i",
          },
        },
        {
          category: {
            $regex: this.queryStr.keyword,
            $options: "i",
          },
        },
        {
          description: {
            $regex: this.queryStr.keyword,
            $options: "i",
          },
        },
      ];
    }

    this.query = this.query.find({ ...keyword });

    return this;
  }
  filter() {
    const queryStrCopy = { ...this.queryStr };

    const removeFields = ["keyword", "page", "limit"];
    removeFields.forEach((key) => delete queryStrCopy[key]);

    let queryString = JSON.stringify(queryStrCopy);
    queryString = queryString.replace(
      /\b(gt|gte|lt|lte)\b/g,
      (match) => `$${match}`
    );

    this.query = this.query.find(JSON.parse(queryString));

    return this;
  }
  pagination(productsPerPage) {
    const currentPage = Number(this.queryStr.page) || 1;
    const skip = productsPerPage * (currentPage - 1);
    this.query = this.query.limit(productsPerPage).skip(skip);
    return this;
  }
}

module.exports = ApiFeatures;
