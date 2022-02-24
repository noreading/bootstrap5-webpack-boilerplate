export default {
  settings: {
    // Move files to the trash instead of deleting them directly, when using the
    // "recreate" or "remove" argument
    useTrash: false
  },
  collections: [
    // Slider Images 1
    {
      /* A name to identify the collection */
      name: "Slider images 1",

      /* The source directory in which the script is looking for image files */
      source: "./src/images/slides",

      /* Define if the resizing should include files in subdirectories */
      recursive: false,

      /* The sizes to create */
      sizes: [
        {
          /* The name of the size, to identify it in case of errors */
          name: "Desktop Resolution",

          /* The width of the new image */
          width: 1110,

          /* The height of the new image */
          height: 547,

          /*
           * Define the method by which the image should fit (default: cover)
           *
           *   cover:     Crop to cover both provided dimensions.
           *   contain:   Embed within both provided dimensions.
           *   fill:      Ignore the aspect ratio of the input and stretch to both provided dimensions.
           *   inside:    Preserving aspect ratio, resize the image to be as large as possible while
           *              ensuring its dimensions are less than or equal to both those specified.
           *   outside:   Preserving aspect ratio, resize the image to be as small as possible while
           *              ensuring its dimensions are greater than or equal to both those specified.
           */
          fit: "cover",

          /*
           * Define the position When using a fit of "cover" or "contain" (default: center).
           *
           *   left
           *   right
           *   top
           *   bottom
           *   center
           *   left top
           *   right top
           *   left bottom
           *   right bottom
           */
          position: "center"
        },
        {
          name: "Tablet Resolution",
          width: 690,
          height: 280
        },
        {
          name: "Smartphone Resolution",
          width: 510,
          height: 207
        }
        // {
        //   name: "Changed width only",
        //   width: 510
        // },
        // {
        //   name: "Changed height only",
        //   height: 207
        // },
        // {
        //   name: "Centered square",
        //   width: 100,
        //   height: 100
        // }
      ]
    },
    // Album Images
    {
      name: "Album images",
      source: "./src/images/album",
      recursive: false,
      sizes: [
        {
          name: "Desktop Resolution",
          width: 255,
          height: 255
        },
        {
          name: "Tablet Resolution",
          width: 210,
          height: 210
        },
        {
          name: "Smartphone Resolution",
          width: 510,
          height: 510
        }
      ]
    }
  ]
}
